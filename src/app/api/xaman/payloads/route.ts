import { ZodError } from "zod";

import {
  getXamanEnvironment,
  XamanConfigurationError,
} from "@/config/server-env";
import { XamanApiError, XamanClient } from "@/features/xaman/client";
import {
  buildTestnetPaymentPayload,
  PaymentInputError,
} from "@/features/xaman/payment-request";
import { createPaymentInputSchema } from "@/features/xaman/schemas";

export const dynamic = "force-dynamic";

function errorResponse(message: string, code: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  try {
    const input = createPaymentInputSchema.parse(await request.json());
    const environment = getXamanEnvironment();
    const paymentRequest = buildTestnetPaymentPayload(
      input,
      environment.XRPL_SOURCE_TAG,
    );
    const payload = await new XamanClient(environment).createPayload(paymentRequest);

    return Response.json(
      {
        payloadId: payload.uuid,
        status: "waiting",
        deepLink: payload.next.always,
        qrPng: payload.refs.qr_png,
        websocketUrl: payload.refs.websocket_status,
        invoiceId: paymentRequest.txjson.InvoiceID,
        transaction: {
          destination: paymentRequest.txjson.Destination,
          destinationTag: paymentRequest.txjson.DestinationTag ?? null,
          amountDrops: paymentRequest.txjson.Amount,
          sourceTag: paymentRequest.txjson.SourceTag,
          network: "testnet",
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError || error instanceof PaymentInputError) {
      return errorResponse(
        error instanceof PaymentInputError
          ? error.message
          : "Check the destination, amount, and Destination Tag.",
        "INVALID_PAYMENT_INPUT",
        400,
      );
    }

    if (error instanceof XamanConfigurationError) {
      return errorResponse(error.message, "XAMAN_NOT_CONFIGURED", 503);
    }

    if (error instanceof XamanApiError) {
      return errorResponse(error.message, "XAMAN_API_ERROR", 502);
    }

    return errorResponse(
      "The Testnet payment request could not be created.",
      "PAYLOAD_CREATION_FAILED",
      500,
    );
  }
}
