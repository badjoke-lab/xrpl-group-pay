import { isValidAddress, xrpToDrops } from "xrpl";

import type { CreatePaymentInput } from "./schemas";

export const TESTNET_FORCE_NETWORK = "TESTNET" as const;

export class PaymentInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentInputError";
  }
}

function parseDestinationTag(value: string | number | undefined) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    parsed > 4_294_967_295
  ) {
    throw new PaymentInputError("Destination Tag must be a UInt32 value.");
  }

  return parsed;
}

export function createInvoiceId(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(32));
  if (bytes.length !== 32) {
    throw new PaymentInputError("InvoiceID entropy must be exactly 32 bytes.");
  }

  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function normalizePaymentInput(input: CreatePaymentInput) {
  const destination = input.destination.trim();
  if (!isValidAddress(destination)) {
    throw new PaymentInputError("Enter a valid classic XRPL address.");
  }

  let amountDrops: string;
  try {
    amountDrops = xrpToDrops(input.amountXrp);
  } catch {
    throw new PaymentInputError(
      "Enter a positive XRP amount with no more than six decimal places.",
    );
  }

  if (BigInt(amountDrops) <= 0n) {
    throw new PaymentInputError("The XRP amount must be greater than zero.");
  }

  return {
    destination,
    amountXrp: input.amountXrp,
    amountDrops,
    destinationTag: parseDestinationTag(input.destinationTag),
  };
}

export type XamanPaymentPayloadRequest = {
  txjson: {
    TransactionType: "Payment";
    Destination: string;
    Amount: string;
    SourceTag: number;
    InvoiceID: string;
    DestinationTag?: number;
  };
  options: {
    submit: true;
    expire: number;
    force_network: typeof TESTNET_FORCE_NETWORK;
  };
};

export function buildTestnetPaymentPayload(
  input: CreatePaymentInput,
  sourceTag: number,
  invoiceId = createInvoiceId(),
): XamanPaymentPayloadRequest {
  const normalized = normalizePaymentInput(input);

  return {
    txjson: {
      TransactionType: "Payment",
      Destination: normalized.destination,
      Amount: normalized.amountDrops,
      SourceTag: sourceTag,
      InvoiceID: invoiceId,
      ...(normalized.destinationTag === undefined
        ? {}
        : { DestinationTag: normalized.destinationTag }),
    },
    options: {
      submit: true,
      expire: 5,
      force_network: TESTNET_FORCE_NETWORK,
    },
  };
}
