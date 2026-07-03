import { describe, expect, it } from "vitest";

import type { Locale } from "@/features/localization/catalog";

import {
  getGuideContent,
  GUIDE_SECTION_IDS,
  guideHref,
} from "./guide-content";

const locales: Locale[] = ["en", "ja", "ko"];
const criticalSections = [
  "overview",
  "roles",
  "payment-modes",
  "create-and-freeze",
  "capability-links",
  "xrp",
  "rlusd",
  "trustset",
  "readiness",
  "payment-flow",
  "verification",
  "progress",
  "status-meanings",
  "failures",
  "recovery",
  "review-required",
  "partial-completion",
  "incomplete-closure",
  "copy-to-revise",
  "privacy",
  "security-limitations",
  "faq",
] as const;

describe("Guide content", () => {
  it("keeps the approved stable section contract", () => {
    expect(GUIDE_SECTION_IDS).toEqual(criticalSections);
  });

  it.each(locales)("provides every stable section and search label in %s", (locale) => {
    const content = getGuideContent(locale);

    expect(content.sections.map((section) => section.id)).toEqual(
      GUIDE_SECTION_IDS,
    );
    expect(content.searchLabel.trim()).not.toBe("");
    expect(content.searchPlaceholder.trim()).not.toBe("");
    expect(content.noResultsTitle.trim()).not.toBe("");
    for (const section of content.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.paragraphs.length).toBeGreaterThan(0);
      expect(section.paragraphs.every((paragraph) => paragraph.trim().length > 0)).toBe(
        true,
      );
      expect(section.bullets?.every((bullet) => bullet.trim().length > 0) ?? true).toBe(
        true,
      );
    }
  });

  it("keeps critical guidance key-identical across English, Japanese, and Korean", () => {
    const ids = locales.map((locale) =>
      getGuideContent(locale).sections.map((section) => section.id),
    );
    expect(ids[1]).toEqual(ids[0]);
    expect(ids[2]).toEqual(ids[0]);
  });

  it("builds public Guide links without query or capability fragments", () => {
    for (const section of GUIDE_SECTION_IDS) {
      const href = guideHref(section);
      expect(href).toBe(`/guide#${section}`);
      expect(href).not.toContain("?");
      expect(href).not.toContain("token=");
    }
  });
});
