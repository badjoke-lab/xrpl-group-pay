import { isValidClassicAddress } from "xrpl";
import { z } from "zod";

import type { MainnetAssetAccess } from "@/features/assets/mainnet-registry";
import { requireApprovedMainnetSettlementAsset } from "@/features/assets/mainnet-registry";
import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { IssuedAssetDescriptor, XrplNetwork } from "@/features/assets/types";
import { unitsToDecimal } from "@/features/money/money";
import { moneyUnitsSchema } from "@/features/money/types";
import {
  XAMAN_FORCE_NETWORKS,
  type XamanTransactionPayloadRequest,
} from "@/features/xaman/payment-request";

import {
  ONE_SHOT_LEDGER_WINDOW,
  xrplSigningStateSchema,
  type XrplSigningState,
} from "./one-shot-payment";

export const TRUSTSET_SET_NO_RIPPLE_FLAG = 131_072;

const trustSetLimitSchema = moneyUnitsSchema.refine(
  (units) => BigInt(units) > 0n,
  "The RLUSD trust limit must be greater than zero.",
);

export type XrplRlusdTrustSetTransaction = Record<string, unknown> & {
  TransactionType: "TrustSet";
  Account: string;
  Sequence: number;
  LastLedgerSequence: number;
  Flags: typeof TRUSTSET_SET_NO_RIPPLE_FLAG;
  LimitAmount: {
    currency: string;
    issuer: string;
    value: string;
  };
};

export type RlusdTrustSetIntent = {
  intentId: string;
  network: XrplNetwork;
  account: string;
  asset: IssuedAssetDescriptor;
  requiredAmountUnits: string;
  limitUnits: string;
  limitValue: string;
  transaction: XrplRlusdTrustSetTransaction;
  payload: XamanTransactionPayloadRequest<XrplRlusdTrustSetTransaction>;
};

export class RlusdTrustSetBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RlusdTrustSetBuildError";
  }
}

function canonicalRlusd(
  network: XrplNetwork,
  mainnetAccess: MainnetAssetAccess | undefined,
): IssuedAssetDescriptor {
  const asset = getRlusdAssetDescriptor(network);
  if (network === "mainnet") {
    const approved = requireApprovedMainnetSettlementAsset(asset.id, mainnetAccess);
    if (
      approved.assetType !== "issued" ||
      approved.currency !== asset.currency ||
      approved.issuer !== asset.issuer ||
      approved.precision !== asset.precision
    ) {
      throw new RlusdTrustSetBuildError(
        "The approved Mainnet RLUSD identity is unavailable.",
      );
    }
  }
  return asset;
}

function requireSigningState(
  account: string,
  state: XrplSigningState,
): XrplSigningState {
  const parsed = xrplSigningStateSchema.safeParse(state);
  if (!parsed.success || parsed.data.account !== account) {
    throw new RlusdTrustSetBuildError(
      "The XRPL signing state does not match the TrustSet account.",
    );
  }
  return parsed.data;
}

export function buildRlusdTrustSetIntent(input: {
  preparationId: string;
  network: XrplNetwork;
  account: string;
  requiredAmountUnits: string;
  limitUnits: string;
  signingState: XrplSigningState;
  mainnetAccess?: MainnetAssetAccess;
}): RlusdTrustSetIntent {
  if (!isValidClassicAddress(input.account)) {
    throw new RlusdTrustSetBuildError(
      "TrustSet preparation requires a valid classic XRPL account.",
    );
  }

  const requiredAmount = trustSetLimitSchema.safeParse(input.requiredAmountUnits);
  const limit = trustSetLimitSchema.safeParse(input.limitUnits);
  if (!requiredAmount.success || !limit.success) {
    throw new RlusdTrustSetBuildError(
      "TrustSet preparation requires positive canonical RLUSD units.",
    );
  }
  if (BigInt(limit.data) < BigInt(requiredAmount.data)) {
    throw new RlusdTrustSetBuildError(
      "The RLUSD trust limit cannot be lower than the required amount.",
    );
  }

  const asset = canonicalRlusd(input.network, input.mainnetAccess);
  const signingState = requireSigningState(input.account, input.signingState);
  const lastLedgerSequence =
    signingState.validatedLedgerIndex + ONE_SHOT_LEDGER_WINDOW;
  if (lastLedgerSequence > 4_294_967_295) {
    throw new RlusdTrustSetBuildError(
      "The TrustSet signing window exceeds the UInt32 ledger range.",
    );
  }

  const limitValue = unitsToDecimal(limit.data, asset.precision);
  const transaction: XrplRlusdTrustSetTransaction = {
    TransactionType: "TrustSet",
    Account: input.account,
    Sequence: signingState.sequence,
    LastLedgerSequence: lastLedgerSequence,
    Flags: TRUSTSET_SET_NO_RIPPLE_FLAG,
    LimitAmount: {
      currency: asset.currency,
      issuer: asset.issuer,
      value: limitValue,
    },
  };

  return {
    intentId: `rlusd-trustset:${input.preparationId}:v1`,
    network: input.network,
    account: input.account,
    asset,
    requiredAmountUnits: requiredAmount.data,
    limitUnits: limit.data,
    limitValue,
    transaction,
    payload: {
      txjson: transaction,
      options: {
        submit: true,
        expire: 5,
        force_network: XAMAN_FORCE_NETWORKS[input.network],
      },
    },
  };
}
