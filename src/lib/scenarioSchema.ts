import { z } from "zod";

export const messageSchema = z.object({
  sender: z.string().min(1),
  senderType: z.enum(["system", "agent", "customer", "cleaner"]),
  channel: z.enum(["sms", "email", "system"]),
  body: z.string().min(1),
  sentAt: z.string().min(1),
});

export const resolutionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const scenarioInputSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
    title: z.string().min(1),
    description: z.string().optional(),

    customerName: z.string().min(1),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),

    jobDetails: z.object({
      membership: z.object({
        code: z.string().min(1),
        status: z.string().min(1),
        paidThru: z.string().min(1),
        paidMonths: z.coerce.number().int().min(0),
      }),
      job: z.object({
        cleanerName: z.string().min(1),
        date: z.string().min(1),
        duration: z.string().min(1),
        price: z.string().min(1),
        status: z.string().min(1),
      }),
      disputeInfo: z.object({
        impliedFeePerDispute: z.string().min(1),
        manualChargesOnFile: z.coerce.number().int().min(0),
      }),
      rating: z.coerce.number().min(0).max(5),
    }),

    messages: z.array(messageSchema).min(1, "Add at least one message"),
    resolutionOptions: z.array(resolutionOptionSchema).min(2, "Add at least two resolution options"),

    answerKey: z.object({
      correctResolutionId: z.string().min(1),
      expectedReplyKeywords: z.array(z.string()),
      notes: z.string().min(1),
    }),
  })
  .refine(
    (data) => data.resolutionOptions.some((o) => o.id === data.answerKey.correctResolutionId),
    {
      message: "The correct resolution must be one of the resolution options",
      path: ["answerKey", "correctResolutionId"],
    }
  );

export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
