"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { scenarioInputSchema } from "@/lib/scenarioSchema";

export interface ScenarioFormState {
  error?: string;
}

export async function saveScenario(
  _prevState: ScenarioFormState,
  formData: FormData
): Promise<ScenarioFormState> {
  const scenarioId = (formData.get("scenarioId") as string | null) || null;
  const raw = formData.get("scenarioJson");

  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    return { error: "Malformed form submission." };
  }

  const result = scenarioInputSchema.safeParse(parsedRaw);
  if (!result.success) {
    return {
      error: result.error.issues
        .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
        .join(" — "),
    };
  }
  const data = result.data;

  const record = {
    slug: data.slug,
    title: data.title,
    description: data.description || null,
    customerName: data.customerName,
    customerPhone: data.customerPhone || null,
    customerEmail: data.customerEmail || null,
    jobDetails: data.jobDetails as unknown as Prisma.InputJsonValue,
    messages: data.messages as unknown as Prisma.InputJsonValue,
    resolutionOptions: data.resolutionOptions as unknown as Prisma.InputJsonValue,
    answerKey: data.answerKey as unknown as Prisma.InputJsonValue,
  };

  try {
    if (scenarioId) {
      await prisma.scenario.update({ where: { id: scenarioId }, data: record });
    } else {
      await prisma.scenario.create({ data: record });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A scenario with that slug already exists — choose a different one." };
    }
    throw e;
  }

  revalidatePath("/admin/scenarios");
  revalidatePath("/admin");
  redirect("/admin/scenarios");
}

export async function setScenarioArchived(formData: FormData) {
  const id = formData.get("id");
  const archived = formData.get("archived") === "true";
  if (typeof id !== "string" || !id) return;

  await prisma.scenario.update({ where: { id }, data: { archived } });
  revalidatePath("/admin/scenarios");
  revalidatePath("/admin");
}
