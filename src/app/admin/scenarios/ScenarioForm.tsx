"use client";

import { useActionState, useState } from "react";
import { slugify } from "@/lib/slug";
import { saveScenario, type ScenarioFormState } from "./actions";
import type {
  ScenarioAnswerKey,
  ScenarioJobDetails,
  ScenarioMessage,
  ResolutionOption,
} from "@/lib/types";

export interface ScenarioFormInitial {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  jobDetails: ScenarioJobDetails;
  messages: ScenarioMessage[];
  resolutionOptions: ResolutionOption[];
  answerKey: ScenarioAnswerKey;
}

const emptyJobDetails: ScenarioJobDetails = {
  membership: { code: "", status: "active", paidThru: "", paidMonths: 1 },
  job: { cleanerName: "", date: "", duration: "2 hr", price: "", status: "submitted_claimed" },
  disputeInfo: { impliedFeePerDispute: "", manualChargesOnFile: 0 },
  rating: 5,
};

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

let rowId = 0;
function nextRowId() {
  rowId += 1;
  return rowId;
}

export function ScenarioForm({ initial }: { initial?: ScenarioFormInitial }) {
  const [state, formAction, pending] = useActionState<ScenarioFormState, FormData>(
    saveScenario,
    {}
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [description, setDescription] = useState(initial?.description ?? "");

  const [customerName, setCustomerName] = useState(initial?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initial?.customerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initial?.customerEmail ?? "");

  const [jobDetails, setJobDetails] = useState<ScenarioJobDetails>(
    initial?.jobDetails ?? emptyJobDetails
  );

  const [messages, setMessages] = useState(
    (initial?.messages ?? []).map((m) => ({ ...m, _key: nextRowId() }))
  );
  const [resolutionOptions, setResolutionOptions] = useState(
    (initial?.resolutionOptions ?? []).map((o) => ({ ...o, _key: nextRowId() }))
  );

  const [correctResolutionId, setCorrectResolutionId] = useState(
    initial?.answerKey.correctResolutionId ?? ""
  );
  const [expectedReplyKeywords, setExpectedReplyKeywords] = useState(
    (initial?.answerKey.expectedReplyKeywords ?? []).join(", ")
  );
  const [answerNotes, setAnswerNotes] = useState(initial?.answerKey.notes ?? "");

  function buildPayload() {
    return {
      slug,
      title,
      description,
      customerName,
      customerPhone,
      customerEmail,
      jobDetails,
      messages: messages.map(({ _key, ...m }) => {
        void _key;
        return { ...m, sentAt: new Date(m.sentAt).toISOString() };
      }),
      resolutionOptions: resolutionOptions.map(({ _key, ...o }) => {
        void _key;
        return o;
      }),
      answerKey: {
        correctResolutionId,
        expectedReplyKeywords: expectedReplyKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        notes: answerNotes,
      },
    };
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const form = e.currentTarget;
        const hidden = form.elements.namedItem("scenarioJson") as HTMLInputElement;
        hidden.value = JSON.stringify(buildPayload());
      }}
      className="space-y-6"
    >
      <input type="hidden" name="scenarioId" value={initial?.id ?? ""} />
      <input type="hidden" name="scenarioJson" />

      {state.error && (
        <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.error}
        </p>
      )}

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Scenario</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs text-neutral-500">Title</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-neutral-500">Slug</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5 font-mono text-xs"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-xs text-neutral-500">
            Description (trainer-facing — what this scenario is meant to test)
          </span>
          <textarea
            className="mt-1 w-full rounded border border-neutral-300 p-1.5"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Fake customer</legend>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="text-xs text-neutral-500">Name</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-neutral-500">Phone</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-neutral-500">Email</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Job / membership panel</legend>
        <div className="grid grid-cols-4 gap-3 text-sm">
          <label>
            <span className="text-xs text-neutral-500">Membership code</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.membership.code}
              onChange={(e) =>
                setJobDetails((j) => ({ ...j, membership: { ...j.membership, code: e.target.value } }))
              }
              required
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Membership status</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.membership.status}
              onChange={(e) =>
                setJobDetails((j) => ({ ...j, membership: { ...j.membership, status: e.target.value } }))
              }
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Paid thru</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.membership.paidThru}
              onChange={(e) =>
                setJobDetails((j) => ({ ...j, membership: { ...j.membership, paidThru: e.target.value } }))
              }
              placeholder="2026-10-18"
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Paid months</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.membership.paidMonths}
              onChange={(e) =>
                setJobDetails((j) => ({
                  ...j,
                  membership: { ...j.membership, paidMonths: Number(e.target.value) },
                }))
              }
            />
          </label>

          <label>
            <span className="text-xs text-neutral-500">Cleaner name</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.job.cleanerName}
              onChange={(e) => setJobDetails((j) => ({ ...j, job: { ...j.job, cleanerName: e.target.value } }))}
              required
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Job date</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.job.date}
              onChange={(e) => setJobDetails((j) => ({ ...j, job: { ...j.job, date: e.target.value } }))}
              placeholder="2026-09-09"
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Duration</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.job.duration}
              onChange={(e) => setJobDetails((j) => ({ ...j, job: { ...j.job, duration: e.target.value } }))}
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Price</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.job.price}
              onChange={(e) => setJobDetails((j) => ({ ...j, job: { ...j.job, price: e.target.value } }))}
              placeholder="$70.00"
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Job status</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.job.status}
              onChange={(e) => setJobDetails((j) => ({ ...j, job: { ...j.job, status: e.target.value } }))}
            />
          </label>

          <label>
            <span className="text-xs text-neutral-500">Implied fee per dispute</span>
            <input
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.disputeInfo.impliedFeePerDispute}
              onChange={(e) =>
                setJobDetails((j) => ({
                  ...j,
                  disputeInfo: { ...j.disputeInfo, impliedFeePerDispute: e.target.value },
                }))
              }
              placeholder="$235.00"
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Manual charges on file</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.disputeInfo.manualChargesOnFile}
              onChange={(e) =>
                setJobDetails((j) => ({
                  ...j,
                  disputeInfo: { ...j.disputeInfo, manualChargesOnFile: Number(e.target.value) },
                }))
              }
            />
          </label>
          <label>
            <span className="text-xs text-neutral-500">Rating (0-5)</span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              className="mt-1 w-full rounded border border-neutral-300 p-1.5"
              value={jobDetails.rating}
              onChange={(e) => setJobDetails((j) => ({ ...j, rating: Number(e.target.value) }))}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Message thread</legend>
        <div className="space-y-3">
          {messages.map((m, idx) => (
            <div key={m._key} className="grid grid-cols-12 gap-2 rounded border border-neutral-200 p-2 text-sm">
              <input
                className="col-span-2 rounded border border-neutral-300 p-1.5"
                placeholder="Sender name"
                value={m.sender}
                onChange={(e) =>
                  setMessages((ms) => ms.map((x, i) => (i === idx ? { ...x, sender: e.target.value } : x)))
                }
                required
              />
              <select
                className="col-span-2 rounded border border-neutral-300 p-1.5"
                value={m.senderType}
                onChange={(e) =>
                  setMessages((ms) =>
                    ms.map((x, i) =>
                      i === idx ? { ...x, senderType: e.target.value as ScenarioMessage["senderType"] } : x
                    )
                  )
                }
              >
                <option value="customer">customer</option>
                <option value="agent">agent</option>
                <option value="cleaner">cleaner</option>
                <option value="system">system</option>
              </select>
              <select
                className="col-span-2 rounded border border-neutral-300 p-1.5"
                value={m.channel}
                onChange={(e) =>
                  setMessages((ms) =>
                    ms.map((x, i) =>
                      i === idx ? { ...x, channel: e.target.value as ScenarioMessage["channel"] } : x
                    )
                  )
                }
              >
                <option value="sms">sms</option>
                <option value="email">email</option>
                <option value="system">system</option>
              </select>
              <input
                type="datetime-local"
                className="col-span-3 rounded border border-neutral-300 p-1.5"
                value={toDatetimeLocal(m.sentAt)}
                onChange={(e) =>
                  setMessages((ms) => ms.map((x, i) => (i === idx ? { ...x, sentAt: e.target.value } : x)))
                }
                required
              />
              <input
                className="col-span-2 rounded border border-neutral-300 p-1.5"
                placeholder="Message body"
                value={m.body}
                onChange={(e) =>
                  setMessages((ms) => ms.map((x, i) => (i === idx ? { ...x, body: e.target.value } : x)))
                }
                required
              />
              <button
                type="button"
                className="col-span-1 rounded border border-red-300 text-xs text-red-700"
                onClick={() => setMessages((ms) => ms.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1 text-sm"
          onClick={() =>
            setMessages((ms) => [
              ...ms,
              {
                _key: nextRowId(),
                sender: "",
                senderType: "customer",
                channel: "sms",
                body: "",
                sentAt: new Date().toISOString(),
              },
            ])
          }
        >
          + Add message
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Resolution options (what the trainee can choose)</legend>
        <div className="space-y-2">
          {resolutionOptions.map((o, idx) => (
            <div key={o._key} className="grid grid-cols-12 gap-2 text-sm">
              <input
                className="col-span-3 rounded border border-neutral-300 p-1.5 font-mono text-xs"
                placeholder="id (e.g. issue_credit)"
                value={o.id}
                onChange={(e) =>
                  setResolutionOptions((os) => os.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)))
                }
                required
              />
              <input
                className="col-span-8 rounded border border-neutral-300 p-1.5"
                placeholder="Label shown to the trainee"
                value={o.label}
                onChange={(e) =>
                  setResolutionOptions((os) => os.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))
                }
                required
              />
              <button
                type="button"
                className="col-span-1 rounded border border-red-300 text-xs text-red-700"
                onClick={() => setResolutionOptions((os) => os.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="rounded border border-neutral-300 px-3 py-1 text-sm"
          onClick={() => setResolutionOptions((os) => [...os, { _key: nextRowId(), id: "", label: "" }])}
        >
          + Add resolution option
        </button>
      </fieldset>

      <fieldset className="space-y-3 rounded border border-neutral-300 bg-white p-4">
        <legend className="px-1 text-sm font-medium">Answer key (trainer only — trainees never see this)</legend>
        <label className="block text-sm">
          <span className="text-xs text-neutral-500">Correct resolution</span>
          <select
            className="mt-1 w-full rounded border border-neutral-300 p-1.5"
            value={correctResolutionId}
            onChange={(e) => setCorrectResolutionId(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose…
            </option>
            {resolutionOptions
              .filter((o) => o.id)
              .map((o) => (
                <option key={o._key} value={o.id}>
                  {o.label || o.id}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-xs text-neutral-500">
            Expected reply keywords (comma-separated; leave blank to skip reply grading)
          </span>
          <input
            className="mt-1 w-full rounded border border-neutral-300 p-1.5"
            value={expectedReplyKeywords}
            onChange={(e) => setExpectedReplyKeywords(e.target.value)}
            placeholder="thank, confirm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs text-neutral-500">Notes explaining the correct answer</span>
          <textarea
            className="mt-1 w-full rounded border border-neutral-300 p-1.5"
            rows={2}
            value={answerNotes}
            onChange={(e) => setAnswerNotes(e.target.value)}
            required
          />
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-800 px-5 py-2 text-sm text-white disabled:opacity-40"
      >
        {pending ? "Saving…" : initial ? "Save changes" : "Create scenario"}
      </button>
    </form>
  );
}
