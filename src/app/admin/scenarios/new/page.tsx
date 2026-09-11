import Link from "next/link";
import { ScenarioForm } from "../ScenarioForm";

export default function NewScenarioPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link href="/admin/scenarios" className="text-sm text-blue-700 hover:underline">
        ← Back to scenarios
      </Link>
      <h1 className="text-xl font-semibold">New scenario</h1>
      <ScenarioForm />
    </div>
  );
}
