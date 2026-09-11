"use server";

import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE } from "@/lib/adminAuth";

export async function createTraineeLink(formData: FormData) {
  const scenarioId = formData.get("scenarioId");
  const traineeName = formData.get("traineeName");
  const cohort = formData.get("cohort");

  if (typeof scenarioId !== "string" || !scenarioId) return;
  if (typeof traineeName !== "string" || !traineeName.trim()) return;

  await prisma.traineeLink.create({
    data: {
      scenarioId,
      traineeName: traineeName.trim(),
      cohort: typeof cohort === "string" && cohort.trim() ? cohort.trim() : null,
      token: nanoid(16),
    },
  });

  revalidatePath("/admin");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
