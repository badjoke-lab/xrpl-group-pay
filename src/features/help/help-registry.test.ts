import { describe, expect, it } from "vitest";

import type { Locale } from "@/features/localization/catalog";
import { GUIDE_SECTION_IDS } from "@/features/guide/guide-content";

import {
  getHelpTopic,
  helpGuideHref,
  HELP_TOPIC_IDS,
} from "./help-registry";

const locales: Locale[] = ["en", "ja", "ko"];

describe("contextual-help registry", () => {
  it.each(locales)("provides every help topic in %s", (locale) => {
    for (const id of HELP_TOPIC_IDS) {
      const topic = getHelpTopic(locale, id);
      expect(topic.id).toBe(id);
      expect(topic.title.trim()).not.toBe("");
      expect(topic.short.trim()).not.toBe("");
      expect(topic.detail.length).toBeGreaterThan(0);
      expect(topic.detail.every((paragraph) => paragraph.trim().length > 0)).toBe(
        true,
      );
      expect(GUIDE_SECTION_IDS).toContain(topic.guideSection);
    }
  });

  it("uses only stable public Guide anchors", () => {
    for (const id of HELP_TOPIC_IDS) {
      const href = helpGuideHref(id);
      expect(href).toMatch(/^\/guide#[a-z0-9-]+$/);
      expect(href).not.toContain("?");
      expect(href).not.toContain("token=");
    }
  });

  it("covers the critical field, state, recovery, and destructive-action families", () => {
    expect(HELP_TOPIC_IDS).toEqual(
      expect.arrayContaining([
        "payment-modes",
        "recipient",
        "destination-tag",
        "settlement-asset",
        "allocation",
        "readiness",
        "xrp-readiness",
        "rlusd-readiness",
        "payment-status",
        "verification",
        "safe-recovery",
        "review-required",
        "partial-completion",
        "incomplete-closure",
        "copy-to-revise",
        "destructive-confirmation",
      ]),
    );
  });
});
