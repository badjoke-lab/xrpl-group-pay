import { getXrpAssetDescriptor } from "@/features/assets/registry";
import {
  BILL_SETTLEMENT_CONTRACT_VERSION,
  PAYMENT_SLOT_CONTRACT_VERSION,
} from "@/features/persistence/asset-records";

export const TESTNET_XRP_WRITE_ASSET = getXrpAssetDescriptor("testnet");

export const INSERT_ASSET_AWARE_BILL = `
  INSERT INTO bills (
    id,
    public_id,
    public_token_hash,
    admin_token_hash,
    title,
    network,
    destination_address,
    destination_tag,
    total_drops,
    creator_share_drops,
    settlement_contract_version,
    settlement_asset_id,
    settlement_asset_type,
    settlement_currency,
    settlement_issuer,
    settlement_amount_scale,
    total_amount_units,
    creator_share_amount_units,
    status,
    revision,
    frozen_at,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, 'testnet', ?6, ?7, ?8, ?9,
    ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17,
    'open', 1, ?18, NULL, ?18, ?18
  )
`;

export const INSERT_ASSET_AWARE_SLOT = `
  INSERT INTO payment_slots (
    id,
    public_id,
    bill_id,
    public_token_hash,
    participant_label,
    expected_payer_address,
    expected_amount_drops,
    invoice_id,
    payment_contract_version,
    asset_id,
    asset_type,
    currency_code,
    issuer,
    amount_scale,
    expected_amount_units,
    status,
    paid_receipt_id,
    paid_tx_hash,
    paid_ledger_index,
    paid_at,
    created_at,
    updated_at
  ) VALUES (
    ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8,
    ?9, ?10, ?11, ?12, ?13, ?14, ?15,
    'unpaid', NULL, NULL, NULL, NULL, ?16, ?16
  )
`;

export function billAssetWriteValues(
  totalUnits: string,
  creatorShareUnits: string,
) {
  return [
    BILL_SETTLEMENT_CONTRACT_VERSION,
    TESTNET_XRP_WRITE_ASSET.id,
    TESTNET_XRP_WRITE_ASSET.assetType,
    TESTNET_XRP_WRITE_ASSET.currency,
    TESTNET_XRP_WRITE_ASSET.issuer,
    TESTNET_XRP_WRITE_ASSET.precision,
    totalUnits,
    creatorShareUnits,
  ] as const;
}

export function slotAssetWriteValues(expectedUnits: string) {
  return [
    PAYMENT_SLOT_CONTRACT_VERSION,
    TESTNET_XRP_WRITE_ASSET.id,
    TESTNET_XRP_WRITE_ASSET.assetType,
    TESTNET_XRP_WRITE_ASSET.currency,
    TESTNET_XRP_WRITE_ASSET.issuer,
    TESTNET_XRP_WRITE_ASSET.precision,
    expectedUnits,
  ] as const;
}
