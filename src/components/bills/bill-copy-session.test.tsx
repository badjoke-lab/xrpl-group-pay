import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  BILL_DRAFT_SESSION_EVENT,
  clearBillDraftSession,
  readBillDraftSession,
  writeBillDraftSession,
} from "./bill-draft-session";
import { newBillDraft } from "./bill-form-model";

const SOURCE = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("copied Bill draft session", () => {
  it("preserves source metadata across ordinary autosaves", () => {
    const draft = newBillDraft("testnet");
    writeBillDraftSession("testnet", draft, 1, SOURCE);
    writeBillDraftSession(
      "testnet",
      { ...draft, title: "Revised dinner" },
      2,
    );

    expect(readBillDraftSession("testnet")).toMatchObject({
      copiedFromPublicId: SOURCE,
      step: 2,
      draft: { title: "Revised dinner" },
    });
  });

  it("clears source metadata with the draft and announces changes", () => {
    const listener = vi.fn();
    window.addEventListener(BILL_DRAFT_SESSION_EVENT, listener);
    writeBillDraftSession("testnet", newBillDraft("testnet"), 1, SOURCE);
    clearBillDraftSession("testnet");

    expect(readBillDraftSession("testnet")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(BILL_DRAFT_SESSION_EVENT, listener);
  });

  it("does not accept arbitrary source text as Bill identity metadata", () => {
    writeBillDraftSession("testnet", newBillDraft("testnet"), 1, "not-a-bill");
    expect(readBillDraftSession("testnet")).not.toHaveProperty(
      "copiedFromPublicId",
    );
  });
});
