import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { ScenarioAnswerKey } from "@/lib/types";
import { submitTrainerReview } from "./actions";

const flagStyles: Record<string, string> = {
  correct: "bg-green-100 text-green-800",
  incorrect: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
  pending: "bg-neutral-100 text-neutral-600",
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const link = await prisma.traineeLink.findUnique({
    where: { id },
    include: {
      scenario: true,
      review: true,
      actions: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!link) notFound();

  const answerKey = link.scenario.answerKey as unknown as ScenarioAnswerKey;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/admin" className="text-sm text-blue-700 hover:underline">
        ← Back to dashboard
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{link.traineeName}</h1>
        <p className="text-sm text-neutral-500">{link.scenario.title}</p>
      </div>

      <section className="rounded border border-neutral-300 bg-white p-4">
        <h2 className="mb-2 font-medium">Answer key (trainer only)</h2>
        <p className="text-sm">
          <span className="text-neutral-500">Correct resolution:</span>{" "}
          {answerKey.correctResolutionId}
        </p>
        <p className="text-sm">
          <span className="text-neutral-500">Expected reply keywords:</span>{" "}
          {answerKey.expectedReplyKeywords.join(", ") || "none"}
        </p>
        <p className="mt-1 text-sm text-neutral-600">{answerKey.notes}</p>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-4">
        <h2 className="mb-2 font-medium">Action log</h2>
        {link.actions.length === 0 && (
          <p className="text-sm text-neutral-400">No actions logged yet.</p>
        )}
        <ol className="space-y-2">
          {link.actions.map((a) => (
            <li key={a.id} className="rounded border border-neutral-200 p-2 text-sm">
              <div className="flex justify-between text-xs text-neutral-500">
                <span className="font-medium text-neutral-700">{a.type}</span>
                <span>{new Date(a.createdAt).toLocaleString()}</span>
              </div>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-neutral-600">
                {JSON.stringify(a.payload, null, 2)}
              </pre>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded border border-neutral-300 bg-white p-4">
        <h2 className="mb-2 font-medium">Grading</h2>
        <p className="mb-3 text-sm">
          <span className="text-neutral-500">Auto flag:</span>{" "}
          <span className={`rounded px-2 py-0.5 text-xs ${flagStyles[link.review?.autoFlag ?? "pending"]}`}>
            {link.review?.autoFlag ?? "pending"}
          </span>
          <br />
          <span className="text-neutral-500">Auto notes:</span> {link.review?.autoNotes ?? "—"}
        </p>

        <form action={submitTrainerReview} className="space-y-2">
          <input type="hidden" name="traineeLinkId" value={link.id} />
          <label className="block text-xs text-neutral-500">Trainer verdict</label>
          <select
            name="trainerFlag"
            defaultValue={link.review?.trainerFlag ?? ""}
            className="rounded border border-neutral-300 p-1.5 text-sm"
            required
          >
            <option value="" disabled>
              Choose…
            </option>
            <option value="correct">Correct</option>
            <option value="partial">Partial</option>
            <option value="incorrect">Incorrect</option>
          </select>
          <label className="block text-xs text-neutral-500">Notes for the trainee</label>
          <textarea
            name="trainerNotes"
            defaultValue={link.review?.trainerNotes ?? ""}
            rows={3}
            className="w-full rounded border border-neutral-300 p-2 text-sm"
          />
          <button type="submit" className="rounded bg-neutral-800 px-4 py-1.5 text-sm text-white">
            Save review
          </button>
          {link.review?.reviewedAt && (
            <p className="text-xs text-neutral-400">
              Last reviewed {new Date(link.review.reviewedAt).toLocaleString()}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
