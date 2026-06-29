#!/usr/bin/env node

import { chmod, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { checkMainnetRlusdAcceptanceReadiness } from "./check-mainnet-rlusd-acceptance-readiness.mjs";

const ENDPOINTS = Object.freeze([
  "https://s1.ripple.com:51234/",
  "https://s2.ripple.com:51234/",
]);
const ASSET = Object.freeze({
  id: "xrpl:mainnet:rlusd",
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  precision: 6,
});
const FEE_HEADROOM_MULTIPLIER = 4n;

export class MainnetRlusdAccountReadinessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MainnetRlusdAccountReadinessError";
    this.code = code;
  }
}

function blocked(code, message) {
  throw new MainnetRlusdAccountReadinessError(code, message);
}

function parseInteger(value, field, { minimum = 0n } = {}) {
  const text = String(value ?? "");
  if (!/^\d+$/.test(text)) {
    blocked("INVALID_LEDGER_DATA", `${field} is not an unsigned integer.`);
  }
  const parsed = BigInt(text);
  if (parsed < minimum) {
    blocked("INVALID_LEDGER_DATA", `${field} is below its minimum.`);
  }
  return parsed;
}

function parseDecimal(value, field) {
  const text = String(value ?? "");
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match) {
    blocked("INVALID_LEDGER_DATA", `${field} is not a valid decimal.`);
  }

  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) {
    blocked("INVALID_LEDGER_DATA", `${field} has an unsupported exponent.`);
  }

  const digits = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "");
  if (digits.length > 64) {
    blocked("INVALID_LEDGER_DATA", `${field} is too large.`);
  }

  return {
    coefficient: (match[1] === "-" ? -1n : 1n) * BigInt(digits || "0"),
    scale: fraction.length - exponent,
  };
}

function alignDecimal(value, scale) {
  const power = scale - value.scale;
  if (power < 0 || power > 200) {
    blocked("INVALID_LEDGER_DATA", "Decimal values cannot be aligned safely.");
  }
  return value.coefficient * 10n ** BigInt(power);
}

function decimalAtLeast(left, right) {
  const commonScale = Math.max(left.scale, right.scale, 0);
  return alignDecimal(left, commonScale) >= alignDecimal(right, commonScale);
}

function decimalDifferenceAtLeast(minuend, subtrahend, required) {
  const commonScale = Math.max(
    minuend.scale,
    subtrahend.scale,
    required.scale,
    0,
  );
  return (
    alignDecimal(minuend, commonScale) -
      alignDecimal(subtrahend, commonScale) >=
    alignDecimal(required, commonScale)
  );
}

function amountUnitsDecimal(units) {
  return { coefficient: BigInt(units), scale: ASSET.precision };
}

function exactTrustLine(lines) {
  return lines.find(
    (line) =>
      line?.account === ASSET.issuer &&
      String(line?.currency ?? "").toUpperCase() === ASSET.currency,
  );
}

function trustLineFrozen(line) {
  return Boolean(
    line?.freeze ||
      line?.freeze_peer ||
      line?.deep_freeze ||
      line?.deep_freeze_peer,
  );
}

function requireOfficialTrustLine(lines, role, issuerRequiresAuthorization) {
  const line = exactTrustLine(lines);
  if (!line) {
    blocked(
      `${role.toUpperCase()}_TRUST_LINE_MISSING`,
      `${role} does not have the exact official RLUSD trust line.`,
    );
  }
  if (trustLineFrozen(line)) {
    blocked(
      `${role.toUpperCase()}_TRUST_LINE_FROZEN`,
      `${role} official RLUSD trust line is frozen.`,
    );
  }
  if (issuerRequiresAuthorization && line.peer_authorized !== true) {
    blocked(
      `${role.toUpperCase()}_TRUST_LINE_NOT_AUTHORIZED`,
      `${role} official RLUSD trust line is not authorized by the issuer.`,
    );
  }
  return line;
}

export function evaluateMainnetRlusdAccountReadiness(input) {
  const {
    destination,
    destinationTag,
    payer,
    primaryAmountUnits,
    billTotalUnits,
    ledgerIndex,
    reserveBaseDrops,
    reserveIncrementDrops,
    feeDrops,
    destinationInfo,
    payerInfo,
    issuerInfo,
    destinationLines,
    payerLines,
  } = input;

  if (!destinationInfo) {
    blocked("DESTINATION_ACCOUNT_NOT_FOUND", "Destination account was not found.");
  }
  if (destinationInfo.flags.requireDestinationTag && destinationTag === null) {
    blocked(
      "DESTINATION_TAG_REQUIRED",
      "Destination account requires a Destination Tag.",
    );
  }
  if (destinationInfo.flags.depositAuth) {
    blocked(
      "DESTINATION_DEPOSIT_AUTHORIZATION_REQUIRED",
      "Destination account has Deposit Authorization enabled.",
    );
  }
  if (!payerInfo) {
    blocked("PAYER_ACCOUNT_NOT_FOUND", "Payer account was not found.");
  }
  if (!issuerInfo) {
    blocked("ISSUER_ACCOUNT_NOT_FOUND", "Official RLUSD issuer was not found.");
  }
  if (issuerInfo.flags.globalFreeze) {
    blocked("ISSUER_GLOBAL_FREEZE", "Official RLUSD issuer is globally frozen.");
  }

  const destinationLine = requireOfficialTrustLine(
    destinationLines,
    "destination",
    issuerInfo.flags.requireAuthorization,
  );
  const payerLine = requireOfficialTrustLine(
    payerLines,
    "payer",
    issuerInfo.flags.requireAuthorization,
  );

  const destinationBalance = parseDecimal(
    destinationLine.balance,
    "destination RLUSD balance",
  );
  const destinationLimit = parseDecimal(
    destinationLine.limit,
    "destination RLUSD trust-line limit",
  );
  const billAmount = amountUnitsDecimal(billTotalUnits);
  if (!decimalDifferenceAtLeast(destinationLimit, destinationBalance, billAmount)) {
    blocked(
      "DESTINATION_TRUST_LINE_CAPACITY_INSUFFICIENT",
      "Destination RLUSD trust line does not have enough remaining capacity for the full Bill.",
    );
  }

  const payerBalance = parseDecimal(payerLine.balance, "payer RLUSD balance");
  const primaryAmount = amountUnitsDecimal(primaryAmountUnits);
  if (!decimalAtLeast(payerBalance, primaryAmount)) {
    blocked(
      "PAYER_RLUSD_BALANCE_INSUFFICIENT",
      "Payer RLUSD balance is below the primary amount.",
    );
  }

  const payerXrpBalanceDrops = parseInteger(
    payerInfo.balanceDrops,
    "payer XRP balance",
  );
  const payerOwnerCount = parseInteger(payerInfo.ownerCount, "payer OwnerCount");
  const reserveBase = parseInteger(reserveBaseDrops, "base reserve");
  const reserveIncrement = parseInteger(
    reserveIncrementDrops,
    "incremental reserve",
  );
  const requiredReserveDrops = reserveBase + payerOwnerCount * reserveIncrement;
  const spendableXrpDrops = payerXrpBalanceDrops - requiredReserveDrops;

  const feeCandidates = [
    feeDrops.baseFee,
    feeDrops.minimumFee,
    feeDrops.medianFee,
    feeDrops.openLedgerFee,
  ].map((value, index) =>
    parseInteger(value, `fee candidate ${index + 1}`, { minimum: 1n }),
  );
  const feeBaselineDrops = feeCandidates.reduce(
    (maximum, value) => (value > maximum ? value : maximum),
    0n,
  );
  const requiredFeeHeadroomDrops =
    feeBaselineDrops * FEE_HEADROOM_MULTIPLIER;

  if (spendableXrpDrops < requiredFeeHeadroomDrops) {
    blocked(
      "PAYER_XRP_FEE_HEADROOM_INSUFFICIENT",
      "Payer does not have enough XRP above the calculated reserve for the fee headroom requirement.",
    );
  }

  return {
    schema_version: 1,
    network: "mainnet",
    state: "ready",
    asset_id: ASSET.id,
    currency: ASSET.currency,
    issuer: ASSET.issuer,
    ledger_index: ledgerIndex,
    destination: {
      address: destination,
      destination_tag: destinationTag,
      trust_line_checked: true,
      trust_line_balance: String(destinationLine.balance),
      trust_line_limit: String(destinationLine.limit),
      full_bill_capacity_ready: true,
    },
    payer: {
      address: payer,
      trust_line_checked: true,
      rlusd_balance: String(payerLine.balance),
      primary_amount_units: String(primaryAmountUnits),
      rlusd_balance_ready: true,
      xrp_balance_drops: payerXrpBalanceDrops.toString(),
      owner_count: payerOwnerCount.toString(),
      reserve_requirement_drops: requiredReserveDrops.toString(),
      spendable_xrp_drops: spendableXrpDrops.toString(),
      required_fee_headroom_drops: requiredFeeHeadroomDrops.toString(),
      xrp_fee_headroom_ready: true,
    },
    bill_total_units: String(billTotalUnits),
    issuer_global_freeze: false,
    issuer_authorization_required: Boolean(
      issuerInfo.flags.requireAuthorization,
    ),
  };
}

async function rpc(endpoint, method, params = {}) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      method,
      params: [{ ...params, api_version: 2 }],
      id: `xrpl-group-pay-mainnet-rlusd-${method}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${method} returned HTTP ${response.status}.`);
  }
  const body = await response.json();
  if (!body || typeof body.result !== "object" || body.result === null) {
    throw new Error(`${method} returned an invalid result.`);
  }
  return body.result;
}

function normalizeFlags(flags) {
  return {
    requireDestinationTag: Boolean(flags?.requireDestinationTag),
    depositAuth: Boolean(flags?.depositAuth),
    globalFreeze: Boolean(flags?.globalFreeze),
    requireAuthorization: Boolean(flags?.requireAuthorization),
  };
}

async function readAccountInfo(endpoint, account, ledgerIndex) {
  const result = await rpc(endpoint, "account_info", {
    account,
    ledger_index: ledgerIndex,
  });
  if (result.error === "actNotFound") return null;
  if (
    result.validated !== true ||
    Number(result.ledger_index) !== ledgerIndex ||
    result.account_data?.Account !== account
  ) {
    throw new Error("account_info did not return the requested validated ledger.");
  }
  return {
    account,
    balanceDrops: String(result.account_data.Balance),
    ownerCount: String(result.account_data.OwnerCount),
    flags: normalizeFlags(result.account_flags),
  };
}

async function readAccountLines(endpoint, account, peer, ledgerIndex) {
  const lines = [];
  let marker;

  for (let page = 0; page < 10; page += 1) {
    const result = await rpc(endpoint, "account_lines", {
      account,
      peer,
      ledger_index: ledgerIndex,
      limit: 400,
      ...(marker === undefined ? {} : { marker }),
    });
    if (result.error === "actNotFound") return [];
    if (
      result.validated !== true ||
      Number(result.ledger_index) !== ledgerIndex ||
      result.account !== account ||
      !Array.isArray(result.lines)
    ) {
      throw new Error("account_lines did not return the requested validated ledger.");
    }
    lines.push(...result.lines);
    marker = result.marker;
    if (marker === undefined) return lines;
  }

  throw new Error("account_lines pagination exceeded the safety limit.");
}

async function readEndpointSnapshot(endpoint, summary) {
  const serverState = await rpc(endpoint, "server_state", {
    ledger_index: "current",
  });
  const validatedLedger = serverState.state?.validated_ledger;
  const ledgerIndex = Number(validatedLedger?.seq);
  if (
    !Number.isInteger(ledgerIndex) ||
    ledgerIndex <= 0 ||
    validatedLedger?.reserve_base === undefined ||
    validatedLedger?.reserve_inc === undefined
  ) {
    throw new Error("server_state did not expose a validated ledger snapshot.");
  }

  const [destinationInfo, payerInfo, issuerInfo, destinationLines, payerLines, fee] =
    await Promise.all([
      readAccountInfo(endpoint, summary.destinationAddress, ledgerIndex),
      readAccountInfo(endpoint, summary.expectedPayerAddress, ledgerIndex),
      readAccountInfo(endpoint, ASSET.issuer, ledgerIndex),
      readAccountLines(
        endpoint,
        summary.destinationAddress,
        ASSET.issuer,
        ledgerIndex,
      ),
      readAccountLines(
        endpoint,
        summary.expectedPayerAddress,
        ASSET.issuer,
        ledgerIndex,
      ),
      rpc(endpoint, "fee"),
    ]);

  if (!fee.drops) {
    throw new Error("fee did not expose drop-denominated fee values.");
  }

  return evaluateMainnetRlusdAccountReadiness({
    destination: summary.destinationAddress,
    destinationTag: summary.destinationTag,
    payer: summary.expectedPayerAddress,
    primaryAmountUnits: summary.primaryAmountUnits,
    billTotalUnits: summary.billTotalUnits,
    ledgerIndex,
    reserveBaseDrops: validatedLedger.reserve_base,
    reserveIncrementDrops: validatedLedger.reserve_inc,
    feeDrops: {
      baseFee: fee.drops.base_fee,
      minimumFee: fee.drops.minimum_fee,
      medianFee: fee.drops.median_fee,
      openLedgerFee: fee.drops.open_ledger_fee,
    },
    destinationInfo,
    payerInfo,
    issuerInfo,
    destinationLines,
    payerLines,
  });
}

export async function readMainnetRlusdAccountReadiness(
  summary,
  endpoints = ENDPOINTS,
) {
  let lastError;
  for (const endpoint of [...new Set(endpoints)]) {
    try {
      const result = await readEndpointSnapshot(endpoint, summary);
      return { ...result, endpoint };
    } catch (error) {
      if (error instanceof MainnetRlusdAccountReadinessError) throw error;
      lastError = error;
    }
  }
  throw new Error(
    `Validated Mainnet account data is unavailable: ${
      lastError instanceof Error ? lastError.message : "unknown error"
    }`,
  );
}

function mappedEnvironment(environment) {
  return {
    ...environment,
    MAINNET_RLUSD_ACCEPTANCE_DESTINATION:
      environment.MAINNET_RLUSD_ACCEPTANCE_DESTINATION ??
      environment.DESTINATION_ADDRESS,
    MAINNET_RLUSD_ACCEPTANCE_DESTINATION_TAG:
      environment.MAINNET_RLUSD_ACCEPTANCE_DESTINATION_TAG ??
      environment.DESTINATION_TAG,
    MAINNET_RLUSD_ACCEPTANCE_PAYER:
      environment.MAINNET_RLUSD_ACCEPTANCE_PAYER ??
      environment.EXPECTED_PAYER_ADDRESS,
    MAINNET_RLUSD_ACCEPTANCE_AMOUNT_UNITS:
      environment.MAINNET_RLUSD_ACCEPTANCE_AMOUNT_UNITS ??
      environment.AMOUNT_UNITS,
  };
}

async function main() {
  const environment = mappedEnvironment(process.env);
  const summary = await checkMainnetRlusdAcceptanceReadiness({ environment });
  const report = await readMainnetRlusdAccountReadiness(summary);
  const checkedAt = new Date().toISOString();
  const output = { ...report, checked_at: checkedAt };
  const outputDirectory = resolve(
    process.cwd(),
    ".tmp",
    "mainnet-rlusd-acceptance",
  );
  const outputPath = resolve(outputDirectory, "account-readiness.json");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(outputPath, 0o600);

  console.log("RLUSD_RECIPIENT_TRUST_LINE_READY");
  console.log("RLUSD_RECIPIENT_FULL_BILL_CAPACITY_READY");
  console.log("RLUSD_PAYER_BALANCE_READY");
  console.log("RLUSD_PAYER_XRP_FEE_HEADROOM_READY");
  console.log("RLUSD_ACCOUNT_READINESS_CONFIRMED");
  console.log(
    "Private detailed result saved to .tmp/mainnet-rlusd-acceptance/account-readiness.json",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    if (error instanceof MainnetRlusdAccountReadinessError) {
      console.error(`RLUSD_ACCOUNT_READINESS_BLOCKED_${error.code}`);
    } else {
      console.error("RLUSD_ACCOUNT_READINESS_UNAVAILABLE");
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
