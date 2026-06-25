import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import type { XrplNetwork } from "@/features/assets/types";
import type { XamanPayloadResponse } from "@/features/xaman/schemas";

const uint32 = z.number().int().min(0).max(4_294_967_295);
const drops = z.string().regex(/^(?:0|[1-9]\d*)$/);
const hash256 = z.string().regex(/^[A-F0-9]{64}$/i);
const classicAddress = z.string().refine(isValidClassicAddress);

const paymentTemplateSchema = z
  .object({
    TransactionType: z.literal("Payment"),
    Account: z.unknown().optional(),
    Destination: classicAddress,
    Amount: z.unknown().optional(),
    DeliverMax: z.unknown().optional(),
    SourceTag: uint32,
    DestinationTag: uint32.optional(),
    InvoiceID: hash256,
    Flags: uint32.optional(),
    SendMax: z.unknown().optional(),
    Paths: z.unknown().optional(),
  })
  .passthrough();

export const TF_PARTIAL_PAYMENT = 0x0002_0000;

export type ExpectedPayment = {
  network?: XrplNetwork;
  transactionId: string;
  sender: string;
  destination: string;
  amountDrops: string;
  sourceTag: number;
  destinationTag: number | null;
  invoiceId: string;
};

export class ExpectedPaymentError extends Error {
  constructor(
    readonly code: "XAMAN_NOT_RESOLVED" | "INVALID_XAMAN_TEMPLATE",
    message: string,
  ) {
    super(message);
    this.name = "ExpectedPaymentError";
  }
}

function invalidTemplate(message: string): never {
  throw new ExpectedPaymentError("INVALID_XAMAN_TEMPLATE", message);
}

export function extractExpectedPayment(
  payload: XamanPayloadResponse,
  configuredSourceTag: number,
  network: XrplNetwork = "testnet",
): ExpectedPayment {
  if (
    !payload.meta.resolved ||
    !payload.meta.signed ||
    !payload.response.txid ||
    !payload.response.account
  ) {
    throw new ExpectedPaymentError(
      "XAMAN_NOT_RESOLVED",
      "The Xaman Sign Request has not produced a signed transaction yet.",
    );
  }

  if (!isValidClassicAddress(payload.response.account)) {
    invalidTemplate("Xaman returned an invalid signer account.");
  }

  if (payload.meta.submit !== true || !payload.payload) {
    invalidTemplate("The Xaman payload is missing its submitted payment template.");
  }

  const parsed = paymentTemplateSchema.safeParse(payload.payload.request_json);
  if (!parsed.success) {
    invalidTemplate("The Xaman payload is not the expected XRP Payment template.");
  }

  const template = parsed.data;
  if (template.Account !== undefined) {
    invalidTemplate("The signer account must be selected by Xaman.");
  }

  if (payload.payload.tx_type !== "Payment") {
    invalidTemplate("The Xaman payload type is not Payment.");
  }

  if (
    payload.payload.tx_destination !== undefined &&
    payload.payload.tx_destination !== null &&
    payload.payload.tx_destination !== template.Destination
  ) {
    invalidTemplate("The Xaman destination summary does not match its template.");
  }

  const expectedDestinationTag = template.DestinationTag ?? null;
  const summarizedDestinationTag = payload.payload.tx_destination_tag ?? null;
  if (summarizedDestinationTag !== expectedDestinationTag) {
    invalidTemplate("The Xaman Destination Tag summary does not match its template.");
  }

  if (template.SourceTag !== configuredSourceTag) {
    invalidTemplate("The Xaman payload does not contain the configured Source Tag.");
  }

  if (template.SendMax !== undefined || template.Paths !== undefined) {
    invalidTemplate("Cross-currency payment fields are not allowed.");
  }

  if (((template.Flags ?? 0) & TF_PARTIAL_PAYMENT) !== 0) {
    invalidTemplate("Partial Payments are not allowed.");
  }

  const amountCandidates = [template.Amount, template.DeliverMax].filter(
    (value) => value !== undefined,
  );
  if (amountCandidates.length !== 1) {
    invalidTemplate("The Xaman payload must contain exactly one XRP amount field.");
  }

  const parsedAmount = drops.safeParse(amountCandidates[0]);
  if (!parsedAmount.success || BigInt(parsedAmount.data) <= BigInt(0)) {
    invalidTemplate("The Xaman payload amount is not a positive XRP drops value.");
  }

  return {
    network,
    transactionId: payload.response.txid.toUpperCase(),
    sender: payload.response.account,
    destination: template.Destination,
    amountDrops: parsedAmount.data,
    sourceTag: template.SourceTag,
    destinationTag: expectedDestinationTag,
    invoiceId: template.InvoiceID.toUpperCase(),
  };
}
