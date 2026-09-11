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

const senderBorder: Record<ScenarioMessage["senderType"], string> = {
  customer: "border-l-blue-500",
  agent: "border-l-neutral-400",
  cleaner: "border-l-green-500",
  system: "border-l-red-500",
};

const senderTag: Record<ScenarioMessage["senderType"], { label: string; className: string }> = {
  customer: { label: "CUST", className: "bg-blue-600 text-white" },
  agent: { label: "AGENT", className: "bg-neutral-700 text-white" },
  cleaner: { label: "CP", className: "bg-green-600 text-white" },
  system: { label: "SYS", className: "bg-red-600 text-white" },
};

const SENDER_LEGEND_COLORS = [
  "text-blue-700",
  "text-green-700",
  "text-purple-700",
  "text-amber-700",
  "text-pink-700",
  "text-cyan-700",
  "text-indigo-700",
  "text-rose-700",
];

function colorForSender(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SENDER_LEGEND_COLORS[hash % SENDER_LEGEND_COLORS.length];
}

type MessageTab = "all" | "actions" | "user_agent" | "from_user" | "from_agent" | "system" | "notes";

const MESSAGE_TABS: { id: MessageTab; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "actions", label: "Actions" },
  { id: "user_agent", label: "User and Agent" },
  { id: "from_user", label: "From User to CS" },
  { id: "from_agent", label: "From Agent" },
  { id: "system", label: "SYSTEM" },
  { id: "notes", label: "Internal Notes" },
];

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
  const [showAllMembership, setShowAllMembership] = useState(false);

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

  const [messageTab, setMessageTab] = useState<MessageTab>("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [senderFilter, setSenderFilter] = useState<string | null>(null);

  const messagesTopRef = useRef<HTMLDivElement>(null);
  const resolvePanelRef = useRef<HTMLDivElement>(null);

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

  const distinctSenders = useMemo(
    () => Array.from(new Set(thread.map((m) => m.sender))),
    [thread]
  );

  const filteredThread = useMemo(() => {
    return sortedThread.filter((m) => {
      if (senderFilter && m.sender !== senderFilter) return false;
      if (messageTab === "system" && m.senderType !== "system") return false;
      if (messageTab === "user_agent" && m.senderType !== "customer" && m.senderType !== "agent")
        return false;
      if (messageTab === "from_user" && m.senderType !== "customer") return false;
      if (messageTab === "from_agent" && m.senderType !== "agent") return false;
      if (messageTab === "notes") return false; // this scenario format has no internal-notes concept yet
      if (dateStart && m.sentAt < new Date(dateStart).toISOString()) return false;
      if (dateEnd && m.sentAt > new Date(`${dateEnd}T23:59:59`).toISOString()) return false;
      return true;
    });
  }, [sortedThread, messageTab, dateStart, dateEnd, senderFilter]);

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

  const caseId = token.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900">
      <div className="h-1 bg-amber-400" />

      {/* Slim chrome bar — cosmetic, mirrors the real CRM's top strip */}
      <div className="flex items-center justify-between border-b border-neutral-300 bg-neutral-900 px-4 py-1 text-xs text-neutral-300">
        <div className="flex items-center gap-2">
          <span aria-hidden>🔍</span>
          <span className="text-neutral-500">Search (not available in training mode)</span>
        </div>
        <div className="font-mono">{thread.length} messages this case</div>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-300 bg-white px-6 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold">{customerName}</span>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white">
              HOMEAGLOW
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
              {jobDetails.job.price} job
            </span>
            {jobDetails.disputeInfo.manualChargesOnFile > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                {jobDetails.disputeInfo.manualChargesOnFile} manual charges on file
              </span>
            )}
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
              ★ {jobDetails.rating.toFixed(1)}
            </span>
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
              Unsubscribed
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {customerPhone} {customerEmail ? `· ${customerEmail}` : ""}
          </div>
          <div className="mt-1 flex gap-1">
            <button
              disabled
              title="Not available in training mode"
              className="cursor-not-allowed rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-400"
            >
              NCW Login
            </button>
            <button
              disabled
              title="Not available in training mode"
              className="cursor-not-allowed rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-400"
            >
              OCW Login
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="text-right text-xs text-neutral-500">
            <div className="font-mono">Case {caseId}</div>
            <div>Training session · {traineeName}</div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => resolvePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className="rounded bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
            >
              Clear {resolved ? 0 : 1} Actions &amp; Next
            </button>
            <button
              title="Not available in training mode"
              className="rounded border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Clear {resolved ? 0 : 1} Actions
            </button>
          </div>
        </div>
      </header>

      <button
        onClick={() => messagesTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="block w-full bg-green-600 px-6 py-1.5 text-center text-xs font-medium text-white hover:bg-green-700"
      >
        ▼ Scroll to Oldest Action ▼
      </button>

      <div
        className={`px-6 py-2 text-center text-sm font-medium text-white ${
          resolved ? "bg-green-700" : "bg-red-700"
        }`}
      >
        {resolved
          ? "✓ Case resolved — nice work. Your trainer will review this session."
          : "This case needs action — reply to the customer and resolve it below."}
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="rounded border border-neutral-300 bg-white">
            <div className="border-b border-neutral-200 px-4 py-2">
              <div className="mb-2 text-sm font-medium text-neutral-600">
                Filter Msgs By Date Range
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="rounded border border-neutral-300 p-1"
                />
                <span className="text-neutral-400">to</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="rounded border border-neutral-300 p-1"
                />
                {(dateStart || dateEnd) && (
                  <button
                    onClick={() => {
                      setDateStart("");
                      setDateEnd("");
                    }}
                    className="rounded border border-neutral-300 px-2 py-1 text-neutral-500 hover:bg-neutral-50"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {MESSAGE_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setMessageTab(t.id)}
                    className={`rounded px-2 py-1 ${
                      messageTab === t.id
                        ? "bg-neutral-800 text-white"
                        : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {distinctSenders.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {distinctSenders.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSenderFilter((cur) => (cur === s ? null : s))}
                      className={`${colorForSender(s)} ${
                        senderFilter === s ? "underline decoration-2" : "hover:underline"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={messagesTopRef} className="max-h-[55vh] space-y-2 overflow-y-auto p-4">
              {filteredThread.length === 0 && (
                <p className="py-6 text-center text-xs text-neutral-400">
                  No messages match this filter.
                </p>
              )}
              {filteredThread.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-r border border-l-4 border-neutral-200 bg-white px-3 py-2 text-sm ${senderBorder[m.senderType]}`}
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${senderTag[m.senderType].className}`}
                      >
                        {senderTag[m.senderType].label}
                      </span>
                      <span className={`font-medium ${colorForSender(m.sender)}`}>{m.sender}</span>
                      <span className="rounded border border-neutral-300 px-1.5 py-0.5 font-mono text-[10px] uppercase text-neutral-500">
                        {m.channel}
                      </span>
                    </span>
                    <span className="font-mono">{formatTime(m.sentAt)}</span>
                  </div>
                  <div className={m.senderType === "system" ? "font-mono text-xs text-neutral-600" : ""}>
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-3">
            <div className="mb-2 text-sm font-medium text-neutral-600">Reply</div>
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

          <div
            ref={resolvePanelRef}
            className="rounded border border-l-4 border-neutral-300 border-l-red-600 bg-white p-4"
          >
            <div className="mb-2 text-sm font-medium text-neutral-600">Resolve this case</div>
            <div className="space-y-1">
              {resolutionOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-sm ${
                    resolutionId === opt.id
                      ? "border-red-300 bg-red-50"
                      : "border-transparent hover:bg-neutral-50"
                  }`}
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
              <span className="flex items-center gap-1 font-mono font-semibold text-neutral-700">
                FC {jobDetails.membership.code}
                <span
                  title="Fixed Cleaning membership — a recurring Homeaglow cleaning plan"
                  className="cursor-help text-neutral-400"
                >
                  ⓘ
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    membershipStatus === "active"
                      ? "bg-green-100 text-green-800"
                      : membershipStatus === "paused"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {membershipStatus}
                </span>
                <button
                  title="Not available in training mode"
                  className="cursor-not-allowed text-xs text-blue-600 underline decoration-dotted"
                >
                  edit
                </button>
              </span>
            </div>
            <div className="text-xs text-neutral-500">
              Paid thru {jobDetails.membership.paidThru} ({jobDetails.membership.paidMonths} mo)
            </div>
            <button
              onClick={() => setShowAllMembership((v) => !v)}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              {showAllMembership ? "Hide history" : "Show All"}
            </button>
            {showAllMembership && (
              <div className="mt-1 rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-500">
                {jobDetails.membership.paidMonths} consecutive paid months on {jobDetails.membership.code},
                currently {membershipStatus}.
              </div>
            )}
            <div className="mt-2 flex gap-1">
              {MEMBERSHIP_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={resolved || membershipUpdating || s === membershipStatus}
                  onClick={() => updateMembership(s)}
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40 hover:bg-neutral-50"
                >
                  Set {s}
                </button>
              ))}
            </div>
            <div className="mt-2 border-t border-neutral-100 pt-2 text-xs">
              <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                Assigned to {traineeName} (trainee)
              </span>
            </div>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-neutral-600">Job</span>
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {jobDetails.job.status}
              </span>
            </div>
            <dl className="space-y-1 font-mono text-xs">
              <div className="flex justify-between">
                <dt className="font-sans text-neutral-500">Cleaner</dt>
                <dd>{jobDetails.job.cleanerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-sans text-neutral-500">Date</dt>
                <dd>{jobDetails.job.date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-sans text-neutral-500">Duration</dt>
                <dd>{jobDetails.job.duration}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-sans text-neutral-500">Price</dt>
                <dd>{jobDetails.job.price}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded border border-neutral-300 bg-white p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-neutral-600">Dispute</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
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
            <div className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-800">
              {jobDetails.disputeInfo.impliedFeePerDispute} implied fee per dispute
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-neutral-500">Manual charges</span>
              <span>
                {jobDetails.disputeInfo.manualChargesOnFile} on file
                {charges.length > 0 ? ` (+${charges.length} this session)` : ""}
              </span>
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
