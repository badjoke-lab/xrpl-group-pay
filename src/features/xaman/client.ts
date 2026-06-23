import "server-only";

import type { XamanEnvironment } from "@/config/server-env";

import {
  xamanCreatePayloadResponseSchema,
  xamanPayloadResponseSchema,
  type XamanCreatePayloadResponse,
  type XamanPayloadResponse,
} from "./schemas";
import type { XamanPaymentPayloadRequest } from "./payment-request";

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
    const response = await this.fetcher(
      `${this.environment.XAMAN_API_BASE_URL}${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-API-Key": this.environment.XAMAN_API_KEY,
          "X-API-Secret": this.environment.XAMAN_API_SECRET,
          ...init.headers,
        },
        cache: "no-store",
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new XamanApiError("Xaman rejected the payload request.", response.status);
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

    return xamanCreatePayloadResponseSchema.parse(body);
  }

  async getPayload(payloadId: string): Promise<XamanPayloadResponse> {
    const body = await this.request(`/payload/${encodeURIComponent(payloadId)}`, {
      method: "GET",
    });

    return xamanPayloadResponseSchema.parse(body);
  }
}
