import { prisma } from "@/lib/prisma";
import { createTraineeLink, signOut } from "./actions";
import { CopyLink } from "./CopyLink";
import Link from "next/link";

const flagStyles: Record<string, string> = {
  correct: "bg-green-100 text-green-800",
  incorrect: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
  pending: "bg-neutral-100 text-neutral-600",
};

export default async function AdminPage() {
  const [scenarios, links] = await Promise.all([
    prisma.scenario.findMany({ where: { archived: false }, orderBy: { createdAt: "asc" } }),
    prisma.traineeLink.findMany({
      orderBy: { createdAt: "desc" },
      include: { scenario: true, review: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Training CRM — Trainer dashboard</h1>
        <form action={signOut}>
          <button className="text-sm text-neutral-500 hover:underline">Sign out</button>
        </form>
      </div>

      <section className="rounded border border-neutral-300 bg-white p-4">
        <h2 className="mb-3 font-medium">Generate a trainee link</h2>
        <form action={createTraineeLink} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-neutral-500">Scenario</label>
            <select
              name="scenarioId"
              className="rounded border border-neutral-300 p-1.5 text-sm"
              required
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500">Trainee name</label>
            <input
              name="traineeName"
              required
              className="rounded border border-neutral-300 p-1.5 text-sm"
              placeholder="e.g. Alex Rivera"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500">Cohort (optional)</label>
            <input
              name="cohort"
              className="rounded border border-neutral-300 p-1.5 text-sm"
              placeholder="e.g. Sept 2026 onboarding"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-neutral-800 px-4 py-1.5 text-sm text-white"
          >
            Create link
          </button>
        </form>
      </section>

      <section className="rounded border border-neutral-300 bg-white">
        <h2 className="border-b border-neutral-200 p-4 font-medium">Trainee sessions</h2>
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Trainee</th>
              <th className="p-3">Scenario</th>
              <th className="p-3">Cohort</th>
              <th className="p-3">Opened</th>
              <th className="p-3">Auto flag</th>
              <th className="p-3">Trainer review</th>
              <th className="p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-t border-neutral-100">
                <td className="p-3">
                  <Link href={`/admin/sessions/${l.id}`} className="text-blue-700 hover:underline">
                    {l.traineeName}
                  </Link>
                </td>
                <td className="p-3">{l.scenario.title}</td>
                <td className="p-3 text-neutral-500">{l.cohort ?? "—"}</td>
                <td className="p-3 text-neutral-500">
                  {l.firstOpenedAt ? new Date(l.firstOpenedAt).toLocaleString() : "Not opened yet"}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      flagStyles[l.review?.autoFlag ?? "pending"]
                    }`}
                  >
                    {l.review?.autoFlag ?? "pending"}
                  </span>
                </td>
                <td className="p-3">
                  {l.review?.trainerFlag ? (
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${flagStyles[l.review.trainerFlag]}`}
                    >
                      {l.review.trainerFlag}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">not reviewed</span>
                  )}
                </td>
                <td className="p-3">
                  <CopyLink token={l.token} />
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-neutral-400">
                  No trainee links yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
