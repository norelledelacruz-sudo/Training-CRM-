import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type {
  ScenarioAnswerKey,
  ScenarioJobDetails,
  ScenarioMessage,
  ResolutionOption,
} from "@/lib/types";
import { ScenarioForm } from "../../ScenarioForm";

export default async function EditScenarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = await prisma.scenario.findUnique({ where: { id } });
  if (!scenario) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Link href="/admin/scenarios" className="text-sm text-blue-700 hover:underline">
        ← Back to scenarios
      </Link>
      <h1 className="text-xl font-semibold">Edit scenario</h1>
      <ScenarioForm
        initial={{
          id: scenario.id,
          slug: scenario.slug,
          title: scenario.title,
          description: scenario.description,
          customerName: scenario.customerName,
          customerPhone: scenario.customerPhone,
          customerEmail: scenario.customerEmail,
          jobDetails: scenario.jobDetails as unknown as ScenarioJobDetails,
          messages: scenario.messages as unknown as ScenarioMessage[],
          resolutionOptions: scenario.resolutionOptions as unknown as ResolutionOption[],
          answerKey: scenario.answerKey as unknown as ScenarioAnswerKey,
        }}
      />
    </div>
  );
}
