"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ScenarioJobDetails,
  ScenarioMessage,
  ResolutionOption,
  MembershipStatus,
  DisputeStatus,
} from "@/lib/types";
import { MEMBERSHIP_STATUSES } from "@/lib/types";

interface Props {
  token: string;
  traineeName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  jobDetails: ScenarioJobDetails;
  messages: ScenarioMessage[];
  resolutionOptions: ResolutionOption[];
}

function log(token: string, type: string, payload: Record<string, unknown> = {}) {
  return fetch("/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, type, payload }),
  }).then((r) => r.json());
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const senderStyles: Record<ScenarioMessage["senderType"], string> = {
  customer: "bg-blue-50 border-blue-200",
  agent: "bg-white border-neutral-200",
  cleaner: "bg-green-50 border-green-200",
  system: "bg-red-50 border-red-200 text-red-800 text-xs",
};

export function CrmView({
  token,
  traineeName,
  customerName,
  customerPhone,
  customerEmail,
  jobDetails,
  messages,
  resolutionOptions,
}: Props) {
  const [thread, setThread] = useState(messages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [resolutionId, setResolutionId] = useState<string>("");
  const [resolved, setResolved] = useState(false);
  const [resolving, setResolving] = useState(false);

  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>(
    jobDetails.membership.status
  );
  const [membershipUpdating, setMembershipUpdating] = useState(false);

  const [disputeStatus, setDisputeStatus] = useState<DisputeStatus>("none");
  const [disputeUpdating, setDisputeUpdating] = useState(false);

  const [credits, setCredits] = useState<{ amount: number; reason: string }[]>([]);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [creditSubmitting, setCreditSubmitting] = useState(false);

  const [charges, setCharges] = useState<{ amount: number; reason: string }[]>([]);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeReason, setChargeReason] = useState("");
  const [chargeSubmitting, setChargeSubmitting] = useState(false);

  const openedLogged = useRef(false);
  useEffect(() => {
    if (openedLogged.current) return;
    openedLogged.current = true;
    log(token, "session_opened", { traineeName });
    // Intentionally run once per mount — this marks when the trainee first opened the case.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedThread = useMemo(
    () => [...thread].sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [thread]
  );

  async function sendReply() {
    if (!reply.trim() || sending) return;
    setSending(true);
    const now = new Date().toISOString();
    await log(token, "reply_sent", { text: reply });
    setThread((t) => [
      ...t,
      {
        sender: `${traineeName} (you)`,
        senderType: "agent",
        channel: "sms",
        body: reply,
        sentAt: now,
      },
    ]);
    setReply("");
    setSending(false);
  }

  async function submitResolution() {
    if (!resolutionId || resolving) return;
    setResolving(true);
    await log(token, "resolution_selected", { resolutionId });
    setResolving(false);
    setResolved(true);
  }

  async function updateMembership(newStatus: MembershipStatus) {
    if (resolved || membershipUpdating || newStatus === membershipStatus) return;
    setMembershipUpdating(true);
    await log(token, "membership_updated", { previousStatus: membershipStatus, newStatus });
    setMembershipStatus(newStatus);
    setMembershipUpdating(false);
  }

  async function updateDispute(newStatus: DisputeStatus) {
    if (resolved || disputeUpdating || newStatus === disputeStatus) return;
    setDisputeUpdating(true);
    await log(token, "dispute_status_changed", { previousStatus: disputeStatus, newStatus });
    setDisputeStatus(newStatus);
    setDisputeUpdating(false);
  }

  async function issueCredit() {
    const amount = Number(creditAmount);
    if (resolved || creditSubmitting || !amount || amount <= 0) return;
    setCreditSubmitting(true);
    await log(token, "credit_issued", { amount, reason: creditReason });
    setCredits((c) => [...c, { amount, reason: creditReason }]);
    setCreditAmount("");
    setCreditReason("");
    setCreditSubmitting(false);
  }

  async function addCharge() {
    const amount = Number(chargeAmount);
    if (resolved || chargeSubmitting || !amount || amount <= 0) return;
    setChargeSubmitting(true);
    await log(token, "charge_added", { amount, reason: chargeReason });
    setCharges((c) => [...c, { amount, reason: chargeReason }]);
    setChargeAmount("");
    setChargeReason("");
    setChargeSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-300 bg-white px-6 py-3">
        <div>
          <div className="text-lg font-semibold">{customerName}</div>
          <div className="text-xs text-neutral-500">
            {customerPhone} {customerEmail ? `· ${customerEmail}` : ""}
          </div>
        </div>
        <div className="text-xs text-neutral-500">
          Training session · {traineeName}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="rounded border border-neutral-300 bg-white">
            <div className="border-b border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600">
              Messages
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
              {sortedThread.map((m, i) => (
                <div
                  key={i}
                  className={`rounded border px-3 py-2 text-sm ${senderStyles[m.senderType]}`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-medium text-neutral-700">{m.sender}</span>
                    <span>{formatTime(m.sentAt)}</span>
                  </div>
                  <div>{m.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-3">
            <textarea
              className="w-full resize-none rounded border border-neutral-300 p-2 text-sm"
              rows={3}
              placeholder="Reply to the customer…"
              value={reply}
              disabled={resolved}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                className="rounded bg-neutral-800 px-4 py-1.5 text-sm text-white disabled:opacity-40"
                onClick={sendReply}
                disabled={resolved || sending || !reply.trim()}
              >
                {sending ? "Sending…" : "Send reply"}
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4">
            <div className="mb-2 text-sm font-medium text-neutral-600">
              Resolve this case
            </div>
            <div className="space-y-2">
              {resolutionOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="resolution"
                    value={opt.id}
                    disabled={resolved}
                    checked={resolutionId === opt.id}
                    onChange={() => setResolutionId(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                className="rounded bg-red-700 px-4 py-1.5 text-sm text-white disabled:opacity-40"
                onClick={submitResolution}
                disabled={resolved || resolving || !resolutionId}
              >
                {resolved ? "Case closed" : resolving ? "Submitting…" : "Do"}
              </button>
            </div>
            {resolved && (
              <div className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
                Submitted. Your trainer will review this session.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-neutral-600">Membership</span>
              <span
                className={`rounded px-2 text-xs ${
                  membershipStatus === "active"
                    ? "bg-green-100 text-green-800"
                    : membershipStatus === "paused"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-neutral-200 text-neutral-600"
                }`}
              >
                {membershipStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{jobDetails.membership.code}</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Paid thru {jobDetails.membership.paidThru} ({jobDetails.membership.paidMonths} mo)
            </div>
            <div className="mt-2 flex gap-1">
              {MEMBERSHIP_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={resolved || membershipUpdating || s === membershipStatus}
                  onClick={() => updateMembership(s)}
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40"
                >
                  Set {s}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 font-medium text-neutral-600">Job</div>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Cleaner</dt>
                <dd>{jobDetails.job.cleanerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Date</dt>
                <dd>{jobDetails.job.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Duration</dt>
                <dd>{jobDetails.job.duration}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Price</dt>
                <dd>{jobDetails.job.price}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Status</dt>
                <dd>{jobDetails.job.status}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-neutral-600">Dispute</span>
              <span
                className={`rounded px-2 text-xs ${
                  disputeStatus === "none"
                    ? "bg-neutral-100 text-neutral-500"
                    : disputeStatus === "disputed"
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                }`}
              >
                {disputeStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Implied fee per dispute</span>
              <span>{jobDetails.disputeInfo.impliedFeePerDispute}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Manual charges on file</span>
              <span>{jobDetails.disputeInfo.manualChargesOnFile}</span>
            </div>
            <div className="mt-2 flex gap-1">
              <button
                disabled={resolved || disputeUpdating || disputeStatus === "disputed"}
                onClick={() => updateDispute("disputed")}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40"
              >
                Mark disputed
              </button>
              <button
                disabled={resolved || disputeUpdating || disputeStatus === "resolved"}
                onClick={() => updateDispute("resolved")}
                className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40"
              >
                Mark resolved
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 font-medium text-neutral-600">Issue a credit</div>
            {credits.map((c, i) => (
              <div key={i} className="mb-1 flex justify-between text-xs text-green-800">
                <span>{c.reason || "credit"}</span>
                <span>${c.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                disabled={resolved}
                className="w-20 rounded border border-neutral-300 p-1 text-xs"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <input
                placeholder="Reason"
                disabled={resolved}
                className="flex-1 rounded border border-neutral-300 p-1 text-xs"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
              <button
                disabled={resolved || creditSubmitting || !Number(creditAmount)}
                onClick={issueCredit}
                className="rounded bg-neutral-800 px-2 text-xs text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 font-medium text-neutral-600">Add a manual charge</div>
            {charges.map((c, i) => (
              <div key={i} className="mb-1 flex justify-between text-xs text-red-800">
                <span>{c.reason || "charge"}</span>
                <span>${c.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex gap-1">
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Amount"
                disabled={resolved}
                className="w-20 rounded border border-neutral-300 p-1 text-xs"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
              />
              <input
                placeholder="Reason"
                disabled={resolved}
                className="flex-1 rounded border border-neutral-300 p-1 text-xs"
                value={chargeReason}
                onChange={(e) => setChargeReason(e.target.value)}
              />
              <button
                disabled={resolved || chargeSubmitting || !Number(chargeAmount)}
                onClick={addCharge}
                className="rounded bg-neutral-800 px-2 text-xs text-white disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Rating</span>
              <span>★ {jobDetails.rating.toFixed(1)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
