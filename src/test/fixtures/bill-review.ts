import { getXrpAssetDescriptor } from "@/features/assets/registry";
import type { BillReview, CreatedBill } from "@/features/bills/types";

export const BILL_DESTINATION = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
export const PAYER_ONE = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
export const PAYER_TWO = "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH";

const XRP = getXrpAssetDescriptor("testnet");

export const BILL_REVIEW_FIXTURE: BillReview = {
  network: "testnet",
  title: "Dinner",
  destinationAddress: BILL_DESTINATION,
  destinationTag: null,
  asset: XRP,
  totalAmount: { code: "XRP", units: "10000000", scale: 6 },
  creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
  allocatedAmount: { code: "XRP", units: "10000000", scale: 6 },
  totalDrops: "10000000",
  creatorShareDrops: "2000000",
  allocatedDrops: "10000000",
  participants: [
    {
      participantLabel: "Alex",
      expectedPayerAddress: PAYER_ONE,
      expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
      expectedAmountDrops: "3000000",
    },
    {
      participantLabel: "Blair",
      expectedPayerAddress: PAYER_TWO,
      expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
      expectedAmountDrops: "5000000",
    },
  ],
};

export const CREATED_BILL_FIXTURE: CreatedBill = {
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: BILL_DESTINATION,
    destinationTag: null,
    asset: XRP,
    totalAmount: BILL_REVIEW_FIXTURE.totalAmount,
    creatorShareAmount: BILL_REVIEW_FIXTURE.creatorShareAmount,
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "open",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
  },
  capabilities: {
    publicToken: "1".repeat(64),
    adminToken: "2".repeat(64),
  },
  slots: BILL_REVIEW_FIXTURE.participants.map((participant, index) => ({
    publicId: `00000000-0000-4000-8000-00000000000d{index + 2}`,
    participantLabel: participant.participantLabel,
    expectedPayerAddress: participant.expectedPayerAddress,
    asset: XRP,
    expectedAmount: participant.expectedAmount,
    expectedAmountDrops: participant.expectedAmountDrops,
    invoiceId: String.fromCharCode(65 + index).repeat(64),
    status: "unpaid" as const,
    paymentToken: String(index + 3).repeat(64),
  })),
};
