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

const CHANNEL_WORD: Record<ScenarioMessage["channel"], string> = {
  sms: "texted",
  email: "emailed",
  system: "logged",
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

function hashString(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

function colorForSender(name: string): string {
  return SENDER_LEGEND_COLORS[hashString(name) % SENDER_LEGEND_COLORS.length];
}

// A stable-looking 6-digit id per sender, purely cosmetic (mirrors the real
// CRM's "<id> <name>" identity format) — not a real account/contact id.
function pseudoIdFor(name: string): string {
  return String(100000 + (hashString(name) % 900000));
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
  const [dateStartInput, setDateStartInput] = useState("");
  const [dateEndInput, setDateEndInput] = useState("");
  const [appliedDateStart, setAppliedDateStart] = useState("");
  const [appliedDateEnd, setAppliedDateEnd] = useState("");
  const [senderFilter, setSenderFilter] = useState<string | null>(null);

  const messagesTopRef = useRef<HTMLDivElement>(null);
  const messagesBottomRef = useRef<HTMLDivElement>(null);
  const resolvePanelRef = useRef<HTMLDivElement>(null);
  const creditFormRef = useRef<HTMLDivElement>(null);

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

  const tabCounts = useMemo(() => {
    const counts: Record<MessageTab, number> = {
      all: sortedThread.length,
      actions: sortedThread.length,
      user_agent: 0,
      from_user: 0,
      from_agent: 0,
      system: 0,
      notes: 0,
    };
    for (const m of sortedThread) {
      if (m.senderType === "customer" || m.senderType === "agent") counts.user_agent++;
      if (m.senderType === "customer") counts.from_user++;
      if (m.senderType === "agent") counts.from_agent++;
      if (m.senderType === "system") counts.system++;
    }
    return counts;
  }, [sortedThread]);

  const filteredThread = useMemo(() => {
    return sortedThread.filter((m) => {
      if (senderFilter && m.sender !== senderFilter) return false;
      if (messageTab === "system" && m.senderType !== "system") return false;
      if (messageTab === "user_agent" && m.senderType !== "customer" && m.senderType !== "agent")
        return false;
      if (messageTab === "from_user" && m.senderType !== "customer") return false;
      if (messageTab === "from_agent" && m.senderType !== "agent") return false;
      if (messageTab === "notes") return false; // this scenario format has no internal-notes concept yet
      if (appliedDateStart && m.sentAt < new Date(appliedDateStart).toISOString()) return false;
      if (appliedDateEnd && m.sentAt > new Date(`${appliedDateEnd}T23:59:59`).toISOString())
        return false;
      return true;
    });
  }, [sortedThread, messageTab, appliedDateStart, appliedDateEnd, senderFilter]);

  const csResponses = useMemo(
    () => messages.filter((m) => m.senderType === "agent").length,
    [messages]
  );
  const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);
  const totalManualCharges = jobDetails.disputeInfo.manualChargesOnFile + charges.length;

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
    <div className="min-h-screen bg-neutral-100 pb-16 text-neutral-900">
      <div className="h-1 bg-amber-400" />

      {/* Slim chrome bar — cosmetic, mirrors the real CRM's top strip */}
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-1.5 text-xs text-neutral-500">
        <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
          Online
        </span>
        <span aria-hidden className="text-neutral-400">
          🔍
        </span>
        <span>{thread.length} messages this case</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-6 w-40 rounded border border-neutral-300 bg-white" />
          <span className="text-neutral-400">▾</span>
        </div>
      </div>

      {/* Header: customer identity (left) + Clear Actions toolbar (right), same row */}
      <div className="border-b border-neutral-300 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{customerName}</span>
              <span className="rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                Realized Net Revenue {jobDetails.job.price}
              </span>
              <span className="rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                Homeaglow
              </span>
              <span className="rounded bg-red-400 px-2 py-0.5 text-xs font-medium text-white">
                {csResponses} CS Responses
              </span>
              <span className="rounded bg-neutral-400 px-2 py-0.5 text-xs font-medium text-white">
                Unsubscribed
              </span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              {customerPhone} {customerEmail ? `· ${customerEmail}` : ""}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() =>
                resolvePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
            >
              Clear {resolved ? 0 : 1} Actions &amp; Next
            </button>
            <button
              title="Not available in training mode"
              className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Clear {resolved ? 0 : 1} Actions
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => messagesTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="block w-full bg-green-600 px-6 py-1.5 text-center text-xs font-medium text-white hover:bg-green-700"
      >
        ▼ Scroll to Oldest Action ▼
      </button>

      <div className="mx-auto max-w-6xl p-4">
        {/* Top summary section: two columns, header content only */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="rounded border border-neutral-300 bg-white p-3 text-sm">
              <div className="flex items-center gap-1 font-medium text-red-700">
                <span aria-hidden>⚠</span>
                <span>{jobDetails.disputeInfo.impliedFeePerDispute} implied fee per dispute</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-blue-600">{totalManualCharges} Manual Charges</span>
                <span>
                  ${totalCredits.toFixed(2)}{" "}
                  <button
                    onClick={() => creditFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="text-blue-600 hover:underline"
                  >
                    Credit
                  </button>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
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
                <button
                  disabled={resolved || disputeUpdating || disputeStatus === "disputed"}
                  onClick={() => updateDispute("disputed")}
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40 hover:bg-neutral-50"
                >
                  Mark disputed
                </button>
                <button
                  disabled={resolved || disputeUpdating || disputeStatus === "resolved"}
                  onClick={() => updateDispute("resolved")}
                  className="rounded border border-neutral-300 px-2 py-0.5 text-xs disabled:opacity-40 hover:bg-neutral-50"
                >
                  Mark resolved
                </button>
              </div>
            </div>

            <div ref={creditFormRef} className="rounded border border-neutral-300 bg-white p-3 text-sm">
              <div className="mb-2 font-medium text-neutral-600">Credits &amp; charges</div>
              {credits.map((c, i) => (
                <div key={`credit-${i}`} className="mb-1 flex justify-between text-xs text-green-800">
                  <span>+ {c.reason || "credit"}</span>
                  <span>${c.amount.toFixed(2)}</span>
                </div>
              ))}
              {charges.map((c, i) => (
                <div key={`charge-${i}`} className="mb-1 flex justify-between text-xs text-red-800">
                  <span>− {c.reason || "charge"}</span>
                  <span>${c.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="mt-1 flex gap-1">
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
                  className="rounded bg-green-700 px-2 text-xs text-white disabled:opacity-40"
                >
                  Credit
                </button>
              </div>
              <div className="mt-1 flex gap-1">
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
                  Charge
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-neutral-300 bg-white p-2 text-xs">
              <span className="rounded bg-amber-300 px-2 py-0.5 font-medium text-amber-900">
                Assigned to {traineeName} (trainee)
              </span>
              <div className="flex items-center gap-2 text-neutral-500">
                <span className="font-mono">Case {caseId}</span>
                <button
                  disabled
                  title="Not available in training mode"
                  className="cursor-not-allowed rounded border border-neutral-300 px-1.5 py-0.5 text-neutral-400"
                >
                  NCW Login
                </button>
                <button
                  disabled
                  title="Not available in training mode"
                  className="cursor-not-allowed rounded border border-neutral-300 px-1.5 py-0.5 text-neutral-400"
                >
                  OCW Login
                </button>
                <button
                  onClick={() =>
                    resolvePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                  className="rounded border border-neutral-300 px-2 py-0.5 hover:bg-neutral-50"
                >
                  Do
                </button>
                <button
                  onClick={() =>
                    messagesTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="rounded border border-neutral-300 px-2 py-0.5 hover:bg-neutral-50"
                >
                  View
                </button>
              </div>
            </div>

            <div className="rounded border border-neutral-300 bg-white p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
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
                  <button
                    onClick={() => setShowAllMembership((v) => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Show All
                  </button>
                </span>
              </div>
              <div className="text-xs text-neutral-500">
                Paid thru {jobDetails.membership.paidThru} ({jobDetails.membership.paidMonths} mo)
              </div>
              {showAllMembership && (
                <div className="mt-1 rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-500">
                  {jobDetails.membership.paidMonths} consecutive paid months on{" "}
                  {jobDetails.membership.code}, currently {membershipStatus}.
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
            </div>

            <div className="rounded border border-neutral-300 bg-white p-2 text-xs">
              <div className="flex items-center gap-2">
                <span>★ {jobDetails.rating.toFixed(1)}</span>
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  {jobDetails.job.status}
                </span>
                <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
                  {totalManualCharges} Invoiced
                </span>
              </div>
              <div className="mt-1 text-neutral-500">
                {jobDetails.job.cleanerName} · {jobDetails.job.date} · {jobDetails.job.duration} ·{" "}
                {jobDetails.job.price}
              </div>
            </div>
          </div>
        </div>

        {/* Filter + tabs + sender legend — full width */}
        <div className="mt-4 rounded border border-neutral-300 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-neutral-600">Filter Msgs By Date Range</div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Start Date mm/dd/yyyy"
              value={dateStartInput}
              onChange={(e) => setDateStartInput(e.target.value)}
              className="rounded border border-neutral-300 p-1.5"
            />
            <input
              type="text"
              placeholder="End Date mm/dd/yyyy"
              value={dateEndInput}
              onChange={(e) => setDateEndInput(e.target.value)}
              className="rounded border border-neutral-300 p-1.5"
            />
            <button
              onClick={() => {
                setAppliedDateStart(dateStartInput);
                setAppliedDateEnd(dateEndInput);
              }}
              className="rounded bg-neutral-800 px-3 py-1.5 text-white hover:bg-neutral-700"
            >
              Go
            </button>
            {(appliedDateStart || appliedDateEnd) && (
              <button
                onClick={() => {
                  setDateStartInput("");
                  setDateEndInput("");
                  setAppliedDateStart("");
                  setAppliedDateEnd("");
                }}
                className="text-neutral-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {MESSAGE_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setMessageTab(t.id)}
                className={`flex items-center gap-1 pb-0.5 ${
                  messageTab === t.id
                    ? "border-b-2 border-neutral-800 font-medium text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
                {tabCounts[t.id] > 0 && t.id !== "all" && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                    {tabCounts[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {distinctSenders.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-neutral-100 pt-2 text-xs">
              <span className="font-medium text-neutral-700">Homeaglow</span>
              {distinctSenders.map((s) => (
                <button
                  key={s}
                  onClick={() => setSenderFilter((cur) => (cur === s ? null : s))}
                  className={`${colorForSender(s)} ${
                    senderFilter === s ? "underline decoration-2" : "hover:underline"
                  }`}
                >
                  {pseudoIdFor(s)} {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message thread — full width, plain hairline rows */}
        <div className="mt-2 rounded border border-neutral-300 bg-white">
          <div ref={messagesTopRef} className="max-h-[55vh] divide-y divide-neutral-100 overflow-y-auto">
            {filteredThread.length === 0 && (
              <p className="py-6 text-center text-xs text-neutral-400">No messages match this filter.</p>
            )}
            {filteredThread.map((m, i) => {
              const highlight =
                m.senderType === "system"
                  ? "bg-red-50"
                  : m.senderType === "cleaner"
                    ? "bg-green-50"
                    : "";
              return (
                <div key={i} className={`px-4 py-2 text-sm ${highlight}`}>
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSenderFilter((cur) => (cur === m.sender ? null : m.sender))}
                        className={`font-medium hover:underline ${colorForSender(m.sender)}`}
                      >
                        C {caseId} {m.sender}
                      </button>
                      <span className="text-xs text-neutral-400">{CHANNEL_WORD[m.channel]}</span>
                    </div>
                    <span className="font-mono text-xs text-neutral-400">{formatTime(m.sentAt)}</span>
                  </div>
                  <div className="mt-0.5 text-neutral-700">{m.body}</div>
                </div>
              );
            })}
            <div ref={messagesBottomRef} />
          </div>
        </div>

        {/* Reply — full width */}
        <div className="mt-3 rounded border border-neutral-300 bg-white p-3">
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

        {/* Resolve — full width */}
        <div
          ref={resolvePanelRef}
          className="mt-3 rounded border border-l-4 border-neutral-300 border-l-red-600 bg-white p-4"
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
      </div>

      {/* Floating contact widget, bottom-right — mirrors the reference screenshot */}
      <div className="fixed bottom-3 right-3 flex items-center gap-3 rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 shadow-lg">
        <span>
          {customerEmail} {customerPhone ? `· ${customerPhone}` : ""}
        </span>
        <button
          onClick={() => messagesBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
          className="rounded bg-green-600 px-2 py-1 font-medium text-white hover:bg-green-700"
        >
          Scroll to Bottom
        </button>
      </div>
    </div>
  );
}
