import "server-only";

import type { XamanEnvironment } from "@/config/server-env";

import type { XamanPaymentPayloadRequest } from "./payment-request";
import {
  xamanCreatePayloadResponseSchema,
  xamanPayloadResponseSchema,
  type XamanCreatePayloadResponse,
  type XamanPayloadResponse,
} from "./schemas";

export class XamanApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "XamanApiError";
  }
}

export class XamanClient {
  constructor(
    private readonly environment: XamanEnvironment,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: string, init: RequestInit) {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("Content-Type", "application/json");
    headers.set("X-API-Key", this.environment.XAMAN_API_KEY);
    headers.set("X-API-Secret", this.environment.XAMAN_API_SECRET);

    let response: Response;
    try {
      response = await this.fetcher(
        `${this.environment.XAMAN_API_BASE_URL}${path}`,
        {
          ...init,
          headers,
          cache: "no-store",
          signal: init.signal ?? AbortSignal.timeout(10_000),
        },
      );
    } catch {
      throw new XamanApiError("Xaman could not be reached.", 502);
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new XamanApiError(
        "Xaman rejected the payload request.",
        response.status,
      );
    }

    return body;
  }

  async createPayload(
    request: XamanPaymentPayloadRequest,
  ): Promise<XamanCreatePayloadResponse> {
    const body = await this.request("/payload", {
      method: "POST",
      body: JSON.stringify(request),
    });
    const parsed = xamanCreatePayloadResponseSchema.safeParse(body);

    if (!parsed.success) {
      throw new XamanApiError("Xaman returned an invalid payload response.", 502);
    }

    return parsed.data;
  }

  async getPayload(payloadId: string): Promise<XamanPayloadResponse> {
    const body = await this.request(
      `/payload/${encodeURIComponent(payloadId)}`,
      { method: "GET" },
    );
    const parsed = xamanPayloadResponseSchema.safeParse(body);

    if (!parsed.success) {
      throw new XamanApiError("Xaman returned an invalid status response.", 502);
    }

    return parsed.data;
  }
}
