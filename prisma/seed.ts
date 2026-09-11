import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Entirely synthetic case data, styled after a real CS conversation shape
// but with no real customer names, numbers, or history.
const demoScenario = {
  slug: "confirmed-completion-dispute",
  title: "Customer confirms a cleaning was completed",
  description:
    "Trainee must read a short SMS thread, decide whether the cleaning was completed, and close the case with the right resolution and reply. Tests whether trainees issue an unnecessary credit when the customer has already confirmed the job was done.",

  customerName: "Jordan Ellery",
  customerPhone: "(555) 019-2244",
  customerEmail: "jordan.ellery@example-mail.com",

  jobDetails: {
    membership: {
      code: "FC-9001",
      status: "active",
      paidThru: "2026-10-18",
      paidMonths: 4,
    },
    job: {
      cleanerName: "Priya M.",
      date: "2026-09-09",
      duration: "2 hr",
      price: "$70.00",
      status: "submitted_claimed",
    },
    disputeInfo: {
      impliedFeePerDispute: "$235.00",
      manualChargesOnFile: 3,
    },
    rating: 4.9,
  },

  messages: [
    {
      sender: "system",
      senderType: "system",
      channel: "system",
      body: "No auto-reply because: ['received_sms_last_3_days|jordanellery', 'received_msg_in_last_7_days|priyam', 'received_template_in_last_3_days|customer_invoiced']",
      sentAt: "2026-09-11T05:48:00-05:00",
    },
    {
      sender: "Emma, Homeaglow HQ",
      senderType: "agent",
      channel: "sms",
      body: "Hi Jordan, I'd like to know if your cleaner completed your cleaning dated September 9 for 2 hours? Please confirm whether a cleaning has been performed, as we want to ensure that all cleanings on your account are completed and that the charges are accurate. - Emma, Homeaglow HQ",
      sentAt: "2026-09-10T22:14:00-05:00",
    },
    {
      sender: "system",
      senderType: "system",
      channel: "email",
      body: "customer_invoiced",
      sentAt: "2026-09-10T16:30:00-05:00",
    },
    {
      sender: "Priya M.",
      senderType: "cleaner",
      channel: "sms",
      body: "I'm finished. Thank you!",
      sentAt: "2026-09-09T21:01:00-05:00",
    },
    {
      sender: "Jordan Ellery",
      senderType: "customer",
      channel: "sms",
      body: "Yes cleaning was completed",
      sentAt: "2026-09-11T05:49:00-05:00",
    },
  ],

  resolutionOptions: [
    { id: "close_confirmed_completed", label: "Close case — customer confirmed cleaning was completed" },
    { id: "issue_credit", label: "Issue a credit to the customer" },
    { id: "escalate_specialist", label: "Escalate to a dispute specialist" },
    { id: "request_more_info", label: "Reply asking the customer for more information" },
  ],

  answerKey: {
    correctResolutionId: "close_confirmed_completed",
    expectedReplyKeywords: ["thank", "confirm"],
    notes:
      "The customer directly confirmed the cleaning was completed. No credit or escalation is warranted — the correct action is to thank the customer for confirming and close the case. Issuing a credit here would be an unnecessary payout; escalating wastes a specialist's time on a already-resolved question.",
  },
};

async function main() {
  const scenario = await prisma.scenario.upsert({
    where: { slug: demoScenario.slug },
    update: demoScenario,
    create: demoScenario,
  });

  console.log(`Seeded scenario: ${scenario.title} (${scenario.slug})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
