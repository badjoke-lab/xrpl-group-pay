import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import type { XrplPaymentTransaction } from "./transaction-builder";
import { XrplPaymentBuildError } from "./payment-builder";

const uint32Schema = z.number().int().min(0).max(4_294_967_295);

export const ONE_SHOT_LEDGER_WINDOW = 60;

export const xrplSigningStateSchema = z
  .object({
    account: z.string().refine(isValidClassicAddress),
    sequence: uint32Schema,
    validatedLedgerIndex: uint32Schema,
  })
  .strict();

export type XrplSigningState = z.infer<typeof xrplSigningStateSchema>;

export type OneShotXrplPaymentTransaction = XrplPaymentTransaction & {
  Account: string;
  Sequence: number;
  LastLedgerSequence: number;
};

export function pinOneShotPaymentTransaction(
  transaction: XrplPaymentTransaction,
  expectedPayer: string,
  signingState: XrplSigningState,
): OneShotXrplPaymentTransaction {
  if (!isValidClassicAddress(expectedPayer)) {
    throw new XrplPaymentBuildError(
      "The expected payer is not a valid XRPL classic address.",
    );
  }

  const parsedState = xrplSigningStateSchema.safeParse(signingState);
  if (!parsedState.success || parsedState.data.account !== expectedPayer) {
    throw new XrplPaymentBuildError(
      "The XRPL signing state does not match the expected payer.",
    );
  }

  const lastLedgerSequence =
    parsedState.data.validatedLedgerIndex + ONE_SHOT_LEDGER_WINDOW;
  if (lastLedgerSequence > 4_294_967_295) {
    throw new XrplPaymentBuildError(
      "The XRPL signing window exceeds the UInt32 ledger range.",
    );
  }

  return {
    ...transaction,
    Account: expectedPayer,
    Sequence: parsedState.data.sequence,
    LastLedgerSequence: lastLedgerSequence,
  };
}
