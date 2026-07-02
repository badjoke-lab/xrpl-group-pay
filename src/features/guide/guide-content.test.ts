import { describe, expect, it } from "vitest";

import type { Locale } from "@/features/localization/catalog";

import {
  getGuideContent,
  GUIDE_SECTION_IDS,
  guideHref,
} from "./guide-content";

const locales: Locale[] = ["en", "ja", "ko"];

describe("Guide content", () => {
  it.each(locales)("provides every stable section in %s", (locale) => {
    const content = getGuideContent(locale);

    expect(content.sections.map((section) => section.id)).toEqual(
      GUIDE_SECTION_IDS,
    );
    for (const section of content.sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.paragraphs.length).toBeGreaterThan(0);
      expect(section.paragraphs.every((paragraph) => paragraph.trim().length > 0)).toBe(
        true,
      );
    }
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
