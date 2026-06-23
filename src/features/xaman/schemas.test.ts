import { describe, expect, it } from "vitest";

import {
  createPaymentInputSchema,
  xamanCreatePayloadResponseSchema,
} from "./schemas";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";

describe("createPaymentInputSchema", () => {
  it("accepts a bounded XRP payment request", () => {
    expect(
      createPaymentInputSchema.parse({
        destination: DESTINATION,
        amountXrp: "4.000001",
        destinationTag: "4294967295",
      }),
    ).toEqual({
      destination: DESTINATION,
      amountXrp: "4.000001",
      destinationTag: "4294967295",
    });
  });

  it("rejects excess precision, unknown properties, and oversized fields", () => {
    expect(() =>
      createPaymentInputSchema.parse({
        destination: DESTINATION,
        amountXrp: "1.0000001",
      }),
    ).toThrow();

    expect(() =>
      createPaymentInputSchema.parse({
        destination: DESTINATION,
        amountXrp: "1",
        unexpected: true,
      }),
    ).toThrow();

    expect(() =>
      createPaymentInputSchema.parse({
        destination: "r".repeat(81),
        amountXrp: "1",
      }),
    ).toThrow();
  });
});

describe("xamanCreatePayloadResponseSchema", () => {
  it("accepts only secure handoff URLs", () => {
    const response = {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
      next: { always: "https://xumm.app/sign/1" },
      refs: {
        qr_png: "https://xumm.app/sign/1_q.png",
        websocket_status: "wss://xumm.app/sign/1",
      },
    };

    expect(xamanCreatePayloadResponseSchema.parse(response).uuid).toBe(
      response.uuid,
    );
    expect(() =>
      xamanCreatePayloadResponseSchema.parse({
        ...response,
        refs: {
          ...response.refs,
          websocket_status: "ws://example.test/sign/1",
        },
      }),
    ).toThrow();
  });
});
