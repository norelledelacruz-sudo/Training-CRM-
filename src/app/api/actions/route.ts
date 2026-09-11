import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { autoGrade } from "@/lib/grading";
import type { ScenarioAnswerKey, ScenarioJobDetails } from "@/lib/types";

const actionSchema = z.object({
  token: z.string().min(1),
  type: z.enum([
    "session_opened",
    "reply_sent",
    "resolution_selected",
    "membership_updated",
    "credit_issued",
    "charge_added",
    "dispute_status_changed",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { token, type, payload } = parsed.data;

  const link = await prisma.traineeLink.findUnique({
    where: { token },
    include: { scenario: true },
  });
  if (!link) {
    return NextResponse.json({ error: "Unknown link" }, { status: 404 });
  }
  if (link.expiresAt && link.expiresAt < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.actionLog.create({
      data: { traineeLinkId: link.id, type, payload: payload as Prisma.InputJsonValue },
    });
    if (!link.firstOpenedAt) {
      await tx.traineeLink.update({
        where: { id: link.id },
        data: { firstOpenedAt: new Date() },
      });
    }
  });

  const allActions = await prisma.actionLog.findMany({
    where: { traineeLinkId: link.id },
    orderBy: { createdAt: "asc" },
  });
  const jobDetails = link.scenario.jobDetails as unknown as ScenarioJobDetails;
  const { flag, notes } = autoGrade(
    allActions,
    link.scenario.answerKey as unknown as ScenarioAnswerKey,
    jobDetails.membership.status
  );

  await prisma.review.upsert({
    where: { traineeLinkId: link.id },
    create: { traineeLinkId: link.id, autoFlag: flag, autoNotes: notes },
    update: { autoFlag: flag, autoNotes: notes },
  });

  return NextResponse.json({ ok: true, autoFlag: flag });
}
