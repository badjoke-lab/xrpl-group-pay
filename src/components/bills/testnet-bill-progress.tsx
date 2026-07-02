"use client";

import { useState } from "react";

import { BillProgress, type BillProgressProps } from "./bill-progress";
import { BillRecoveryControls } from "./bill-recovery-controls";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";

export type TestnetBillProgressProps = BillProgressProps & {
  managementControls?: boolean;
};

export function TestnetBillProgress({
  capabilityToken,
  managementControls = false,
}: TestnetBillProgressProps) {
  const { capability, resolved } = useCapabilityToken(capabilityToken);
  const [revision, setRevision] = useState(0);

  return (
    <>
      <BillProgress
        key={`${capability ?? "unresolved"}:${revision}`}
        capabilityToken={capabilityToken}
      />
      {managementControls && resolved && capability && (
        <BillRecoveryControls
          capability={capability}
          onChanged={() => setRevision((current) => current + 1)}
        />
      )}
    </>
  );
}
