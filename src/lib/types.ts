export type MessageSenderType = "system" | "agent" | "customer" | "cleaner";

export interface ScenarioMessage {
  sender: string;
  senderType: MessageSenderType;
  channel: "sms" | "email" | "system";
  body: string;
  sentAt: string;
}

export interface ScenarioJobDetails {
  membership: {
    code: string;
    status: string;
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

export interface ScenarioAnswerKey {
  correctResolutionId: string;
  expectedReplyKeywords: string[];
  notes: string;
}
