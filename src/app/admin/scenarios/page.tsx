import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { setScenarioArchived } from "./actions";

export default async function ScenariosPage() {
  const scenarios = await prisma.scenario.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { traineeLinks: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-blue-700 hover:underline">
            ← Back to dashboard
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Scenarios</h1>
        </div>
        <Link
          href="/admin/scenarios/new"
          className="rounded bg-neutral-800 px-4 py-1.5 text-sm text-white"
        >
          + New scenario
        </Link>
      </div>

      <div className="rounded border border-neutral-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Links generated</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.id} className="border-t border-neutral-100">
                <td className="p-3">
                  <Link href={`/admin/scenarios/${s.id}/edit`} className="text-blue-700 hover:underline">
                    {s.title}
                  </Link>
                </td>
                <td className="p-3 font-mono text-xs text-neutral-500">{s.slug}</td>
                <td className="p-3">{s._count.traineeLinks}</td>
                <td className="p-3">
                  {s.archived ? (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      archived
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">active</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <form action={setScenarioArchived}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="archived" value={(!s.archived).toString()} />
                    <button type="submit" className="text-xs text-neutral-500 hover:underline">
                      {s.archived ? "Unarchive" : "Archive"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {scenarios.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-neutral-400">
                  No scenarios yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
