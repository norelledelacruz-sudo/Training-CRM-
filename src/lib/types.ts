export type MessageSenderType = "system" | "agent" | "customer" | "cleaner";

export interface ScenarioMessage {
  sender: string;
  senderType: MessageSenderType;
  channel: "sms" | "email" | "system";
  body: string;
  sentAt: string;
}

export const MEMBERSHIP_STATUSES = ["active", "paused", "cancelled"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const DISPUTE_STATUSES = ["none", "disputed", "resolved"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export interface ScenarioJobDetails {
  membership: {
    code: string;
    status: MembershipStatus;
    paidThru: string;
    paidMonths: number;
  };
  job: {
    cleanerName: string;
    date: string;
    duration: string;
    price: string;
    status: string;
  };
  disputeInfo: {
    impliedFeePerDispute: string;
    manualChargesOnFile: number;
  };
  rating: number;
}

export interface ResolutionOption {
  id: string;
  label: string;
}

export interface ExpectedPayout {
  shouldIssue: boolean;
  amount?: number;
}

export interface ScenarioAnswerKey {
  correctResolutionId: string;
  expectedReplyKeywords: string[];
  notes: string;
  // All optional: an unset expectation means "don't grade this dimension".
  expectedMembershipStatus?: MembershipStatus;
  expectedCredit?: ExpectedPayout;
  expectedCharge?: ExpectedPayout;
  expectedDisputeStatus?: DisputeStatus;
}
