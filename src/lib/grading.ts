import type { ScenarioAnswerKey, MembershipStatus, DisputeStatus } from "./types";

export type AutoFlag = "correct" | "incorrect" | "partial" | "pending";

interface ActionForGrading {
  type: string;
  payload: unknown;
}

function lastPayload<T>(actions: ActionForGrading[], type: string): T | undefined {
  const matches = actions.filter((a) => a.type === type);
  return matches.length ? (matches[matches.length - 1].payload as T) : undefined;
}

function sumAmounts(actions: ActionForGrading[], type: string): number {
  return actions
    .filter((a) => a.type === type)
    .reduce((sum, a) => sum + (Number((a.payload as { amount?: number })?.amount) || 0), 0);
}

const AMOUNT_TOLERANCE = 0.01;

/**
 * Compares what a trainee actually did against the scenario's answer key.
 * The resolution choice is the primary gate (wrong resolution is always
 * "incorrect"); reply wording and the optional membership/credit/charge/
 * dispute expectations only ever soften a pass to "partial", never flip an
 * otherwise-correct resolution to "incorrect" outright — a trainer reviews
 * those cases with the specific reasons attached.
 */
export function autoGrade(
  actions: ActionForGrading[],
  answerKey: ScenarioAnswerKey,
  initialMembershipStatus: MembershipStatus
): { flag: AutoFlag; notes: string } {
  const resolutionAction = actions.find((a) => a.type === "resolution_selected");
  if (!resolutionAction) {
    return { flag: "pending", notes: "Trainee has not yet selected a resolution." };
  }

  const chosenResolutionId = (resolutionAction.payload as { resolutionId?: string })
    ?.resolutionId;
  if (chosenResolutionId !== answerKey.correctResolutionId) {
    return {
      flag: "incorrect",
      notes: `Chose resolution "${chosenResolutionId}" instead of "${answerKey.correctResolutionId}".`,
    };
  }

  const failures: string[] = [];

  // Reply wording
  const replyActions = actions.filter((a) => a.type === "reply_sent");
  const combinedReplyText = replyActions
    .map((a) => ((a.payload as { text?: string })?.text ?? "").toLowerCase())
    .join(" ");
  const keywordHits = answerKey.expectedReplyKeywords.filter((kw) =>
    combinedReplyText.includes(kw.toLowerCase())
  );
  if (answerKey.expectedReplyKeywords.length > 0 && keywordHits.length === 0) {
    failures.push(`reply didn't mention: ${answerKey.expectedReplyKeywords.join(", ")}`);
  }

  // Membership status
  if (answerKey.expectedMembershipStatus) {
    const finalStatus =
      lastPayload<{ newStatus?: MembershipStatus }>(actions, "membership_updated")?.newStatus ??
      initialMembershipStatus;
    if (finalStatus !== answerKey.expectedMembershipStatus) {
      failures.push(
        `membership left as "${finalStatus}" instead of "${answerKey.expectedMembershipStatus}"`
      );
    }
  }

  // Dispute status (always starts "none" until the trainee changes it)
  if (answerKey.expectedDisputeStatus) {
    const finalStatus: DisputeStatus =
      lastPayload<{ newStatus?: DisputeStatus }>(actions, "dispute_status_changed")?.newStatus ??
      "none";
    if (finalStatus !== answerKey.expectedDisputeStatus) {
      failures.push(
        `dispute left as "${finalStatus}" instead of "${answerKey.expectedDisputeStatus}"`
      );
    }
  }

  // Credit
  if (answerKey.expectedCredit) {
    const issued = actions.some((a) => a.type === "credit_issued");
    const { shouldIssue, amount } = answerKey.expectedCredit;
    if (shouldIssue !== issued) {
      failures.push(shouldIssue ? "no credit was issued" : "a credit was issued but shouldn't have been");
    } else if (shouldIssue && amount !== undefined) {
      const total = sumAmounts(actions, "credit_issued");
      if (Math.abs(total - amount) > AMOUNT_TOLERANCE) {
        failures.push(`credit issued was $${total.toFixed(2)} instead of $${amount.toFixed(2)}`);
      }
    }
  }

  // Manual charge
  if (answerKey.expectedCharge) {
    const issued = actions.some((a) => a.type === "charge_added");
    const { shouldIssue, amount } = answerKey.expectedCharge;
    if (shouldIssue !== issued) {
      failures.push(shouldIssue ? "no charge was added" : "a charge was added but shouldn't have been");
    } else if (shouldIssue && amount !== undefined) {
      const total = sumAmounts(actions, "charge_added");
      if (Math.abs(total - amount) > AMOUNT_TOLERANCE) {
        failures.push(`charge added was $${total.toFixed(2)} instead of $${amount.toFixed(2)}`);
      }
    }
  }

  if (failures.length === 0) {
    return { flag: "correct", notes: "Matched the answer key on every graded dimension." };
  }

  return {
    flag: "partial",
    notes: `Chose the correct resolution, but: ${failures.join("; ")}.`,
  };
}
