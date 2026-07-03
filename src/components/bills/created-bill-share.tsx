"use client";

import type { CreatedBill } from "@/features/bills/types";

import { CreatedBillSaveWallets } from "./created-bill-save-wallets";
import { CreatedBillSharingPanel } from "./created-bill-sharing-panel";

export function CreatedBillShare({
  created,
  onReset,
}: {
  created: CreatedBill;
  onReset(): void;
}) {
  return (
    <>
      <CreatedBillSharingPanel created={created} onReset={onReset} />
      <CreatedBillSaveWallets created={created} />
    </>
  );
}
