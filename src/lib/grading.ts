import type { ScenarioAnswerKey } from "./types";

export type AutoFlag = "correct" | "incorrect" | "partial" | "pending";

interface ActionForGrading {
  type: string;
  payload: unknown;
}

/**
 * Compares what a trainee actually did against the scenario's answer key.
 * "correct" requires the right resolution AND a reply that hits the expected
 * keywords; missing either drops it to "partial" so the trainer can inspect.
 */
export function autoGrade(
  actions: ActionForGrading[],
  answerKey: ScenarioAnswerKey
): { flag: AutoFlag; notes: string } {
  const resolutionAction = actions.find((a) => a.type === "resolution_selected");
  const replyActions = actions.filter((a) => a.type === "reply_sent");

  if (!resolutionAction) {
    return { flag: "pending", notes: "Trainee has not yet selected a resolution." };
  }

  const chosenResolutionId = (resolutionAction.payload as { resolutionId?: string })
    ?.resolutionId;
  const resolutionCorrect = chosenResolutionId === answerKey.correctResolutionId;

  const combinedReplyText = replyActions
    .map((a) => ((a.payload as { text?: string })?.text ?? "").toLowerCase())
    .join(" ");
  const keywordHits = answerKey.expectedReplyKeywords.filter((kw) =>
    combinedReplyText.includes(kw.toLowerCase())
  );
  const replyCorrect =
    answerKey.expectedReplyKeywords.length === 0 || keywordHits.length > 0;

  if (resolutionCorrect && replyCorrect) {
    return {
      flag: "correct",
      notes: "Chose the correct resolution and reply matched expected keywords.",
    };
  }

  if (!resolutionCorrect) {
    return {
      flag: "incorrect",
      notes: `Chose resolution "${chosenResolutionId}" instead of "${answerKey.correctResolutionId}".`,
    };
  }

  return {
    flag: "partial",
    notes:
      "Chose the correct resolution, but the reply didn't mention: " +
      answerKey.expectedReplyKeywords.filter((kw) => !keywordHits.includes(kw)).join(", "),
  };
}
