import { z } from "zod";

export const paymentRailSchema = z.literal("xrpl");
export const xrplNetworkSchema = z.enum(["testnet", "mainnet"]);
export const assetTypeSchema = z.enum(["native", "issued"]);

export const verificationStrategySchema = z.enum([
  "xrpl-xrp-v1",
  "xrpl-issued-asset-v1",
]);

export const receiptContractSchema = z.enum([
  "xrpl-xrp-payment-v1",
  "xrpl-issued-payment-v1",
]);

const assetIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/)
  .max(128);

const commonAssetDescriptorSchema = z.object({
  id: assetIdSchema,
  paymentRail: paymentRailSchema,
  network: xrplNetworkSchema,
  symbol: z.string().trim().min(1).max(16),
});

export const nativeXrpAssetDescriptorSchema = commonAssetDescriptorSchema
  .extend({
    assetType: z.literal("native"),
    currency: z.literal("XRP"),
    issuer: z.null(),
    precision: z.literal(6),
    verificationStrategy: z.literal("xrpl-xrp-v1"),
    receiptContract: z.literal("xrpl-xrp-payment-v1"),
  })
  .strict();

export const issuedAssetDescriptorSchema = commonAssetDescriptorSchema
  .extend({
    assetType: z.literal("issued"),
    currency: z
      .string()
      .trim()
      .regex(/^(?:[A-Z0-9]{3}|[A-F0-9]{40})$/),
    issuer: z.string().trim().min(25).max(35),
    precision: z.number().int().min(0).max(18),
    verificationStrategy: z.literal("xrpl-issued-asset-v1"),
    receiptContract: z.literal("xrpl-issued-payment-v1"),
  })
  .strict();

export const assetDescriptorSchema = z.discriminatedUnion("assetType", [
  nativeXrpAssetDescriptorSchema,
  issuedAssetDescriptorSchema,
]);

export type XrplNetwork = z.infer<typeof xrplNetworkSchema>;
export type AssetType = z.infer<typeof assetTypeSchema>;
export type AssetDescriptor = z.infer<typeof assetDescriptorSchema>;
export type NativeXrpAssetDescriptor = z.infer<
  typeof nativeXrpAssetDescriptorSchema
>;
export type IssuedAssetDescriptor = z.infer<
  typeof issuedAssetDescriptorSchema
>;
