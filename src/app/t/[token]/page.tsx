import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type {
  ScenarioJobDetails,
  ScenarioMessage,
  ResolutionOption,
} from "@/lib/types";
import { CrmView } from "./CrmView";

export default async function TraineePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.traineeLink.findUnique({
    where: { token },
    include: { scenario: true },
  });

  if (!link) notFound();

  if (link.expiresAt && link.expiresAt < new Date()) {
    return (
      <div className="mx-auto mt-24 max-w-md text-center text-sm text-neutral-600">
        This training link has expired. Ask your trainer for a new one.
      </div>
    );
  }

  const scenario = link.scenario;

  return (
    <CrmView
      token={token}
      traineeName={link.traineeName}
      customerName={scenario.customerName}
      customerPhone={scenario.customerPhone}
      customerEmail={scenario.customerEmail}
      jobDetails={scenario.jobDetails as unknown as ScenarioJobDetails}
      messages={scenario.messages as unknown as ScenarioMessage[]}
      resolutionOptions={scenario.resolutionOptions as unknown as ResolutionOption[]}
    />
  );
}
