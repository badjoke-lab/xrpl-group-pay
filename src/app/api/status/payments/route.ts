import {
  PaymentOperationsConfigurationError,
  resolvePaymentOperations,
  type PaymentOperationsState,
} from "@/config/payment-operations";

export const dynamic = "force-dynamic";

export type PaymentOperationsStatusDependencies = {
  readState(): PaymentOperationsState;
};

const defaultDependencies: PaymentOperationsStatusDependencies = {
  readState() {
    return resolvePaymentOperations(process.env);
  },
};

function json(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function handlePaymentOperationsStatusRequest(
  dependencies: PaymentOperationsStatusDependencies = defaultDependencies,
) {
  try {
    const state = dependencies.readState();
    return json(
      {
        schemaVersion: 1,
        network: state.network,
        status: state.status,
        mode: state.mode,
        operations: {
          create: state.creationEnabled,
          verify: state.verificationEnabled,
        },
      },
      200,
    );
  } catch (error) {
    if (error instanceof PaymentOperationsConfigurationError) {
      return json(
        {
          schemaVersion: 1,
          network: "unknown",
          status: "unavailable",
          operations: { create: false, verify: false },
        },
        503,
      );
    }
    return json(
      {
        schemaVersion: 1,
        network: "unknown",
        status: "unavailable",
        operations: { create: false, verify: false },
      },
      503,
    );
  }
}

export function GET() {
  return handlePaymentOperationsStatusRequest();
}
