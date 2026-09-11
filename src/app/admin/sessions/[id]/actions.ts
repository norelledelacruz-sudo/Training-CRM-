"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function submitTrainerReview(formData: FormData) {
  const traineeLinkId = formData.get("traineeLinkId");
  const trainerFlag = formData.get("trainerFlag");
  const trainerNotes = formData.get("trainerNotes");

  if (typeof traineeLinkId !== "string" || !traineeLinkId) return;
  if (typeof trainerFlag !== "string" || !trainerFlag) return;

  await prisma.review.update({
    where: { traineeLinkId },
    data: {
      trainerFlag,
      trainerNotes: typeof trainerNotes === "string" ? trainerNotes : null,
      reviewedAt: new Date(),
    },
  });

  revalidatePath(`/admin/sessions/${traineeLinkId}`);
  revalidatePath("/admin");
}
