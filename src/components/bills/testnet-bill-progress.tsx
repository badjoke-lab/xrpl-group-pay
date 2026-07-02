"use client";

import { useState } from "react";

import { BillProgress, type BillProgressProps } from "./bill-progress";
import { BillRecoveryControls } from "./bill-recovery-controls";
import { useCapabilityToken } from "@/features/capabilities/use-capability-token";

export type TestnetBillProgressProps = BillProgressProps;

export function TestnetBillProgress({
  capabilityToken,
}: TestnetBillProgressProps) {
  const { capability, resolved } = useCapabilityToken(capabilityToken);
  const [revision, setRevision] = useState(0);

  return (
    <>
      <BillProgress
        key={`${capability ?? "unresolved"}:${revision}`}
        capabilityToken={capabilityToken}
      />
      {resolved && capability && (
        <BillRecoveryControls
          capability={capability}
          onChanged={() => setRevision((current) => current + 1)}
        />
      )}
    </>
  );
}
