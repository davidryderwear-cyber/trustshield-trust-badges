import { describe, it, expect } from "vitest";
import {
  BADGE_ICONS,
  BADGE_TEMPLATES,
  BADGE_CATEGORIES,
  PLAN_LIMITS,
} from "../../app/utils/badge-presets.js";

describe("BADGE_ICONS", () => {
  const iconKeys = Object.keys(BADGE_ICONS);

  it("has 36 icons", () => {
    expect(iconKeys.length).toBe(37);
  });

  it("every icon has name, category, and svg", () => {
    for (const key of iconKeys) {
      const icon = BADGE_ICONS[key];
      expect(icon.name, `${key} missing name`).toBeTruthy();
      expect(icon.category, `${key} missing category`).toBeTruthy();
      expect(icon.svg, `${key} missing svg`).toBeTruthy();
    }
  });

  it("every svg starts with <svg", () => {
    for (const key of iconKeys) {
      expect(
        BADGE_ICONS[key].svg.startsWith("<svg"),
        `${key} svg does not start with <svg`
      ).toBe(true);
    }
  });

  it("every icon category exists in BADGE_CATEGORIES", () => {
    const validCategories = BADGE_CATEGORIES.map((c) => c.key);
    for (const key of iconKeys) {
      expect(
        validCategories,
        `${key} has unknown category "${BADGE_ICONS[key].category}"`
      ).toContain(BADGE_ICONS[key].category);
    }
  });
});

describe("BADGE_CATEGORIES", () => {
  it("has 7 categories", () => {
    expect(BADGE_CATEGORIES.length).toBe(7);
  });

  it("each category has key and label", () => {
    for (const cat of BADGE_CATEGORIES) {
      expect(cat.key).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });
});

describe("BADGE_TEMPLATES", () => {
  const templateKeys = Object.keys(BADGE_TEMPLATES);

  it("has at least 5 templates", () => {
    expect(templateKeys.length).toBeGreaterThanOrEqual(5);
  });

  it("every template has name, description, and badges array", () => {
    for (const key of templateKeys) {
      const t = BADGE_TEMPLATES[key];
      expect(t.name, `${key} missing name`).toBeTruthy();
      expect(t.description, `${key} missing description`).toBeTruthy();
      expect(Array.isArray(t.badges), `${key} badges is not array`).toBe(true);
      expect(t.badges.length, `${key} badges is empty`).toBeGreaterThan(0);
    }
  });

  it("every template badge references a valid BADGE_ICONS key", () => {
    const validKeys = Object.keys(BADGE_ICONS);
    for (const tKey of templateKeys) {
      for (const iconKey of BADGE_TEMPLATES[tKey].badges) {
        expect(
          validKeys,
          `Template "${tKey}" references unknown icon "${iconKey}"`
        ).toContain(iconKey);
      }
    }
  });
});

describe("PLAN_LIMITS", () => {
  it("free plan allows max 3 badges", () => {
    expect(PLAN_LIMITS.free.maxBadges).toBe(3);
  });

  it("starter plan allows unlimited badges", () => {
    expect(PLAN_LIMITS.starter.maxBadges).toBe(999);
  });

  it("free plan restricts custom features", () => {
    expect(PLAN_LIMITS.free.customColors).toBe(false);
    expect(PLAN_LIMITS.free.customUpload).toBe(false);
    expect(PLAN_LIMITS.free.abTesting).toBe(false);
  });

  it("every plan has all expected limit keys", () => {
    const expectedKeys = [
      "maxBadges", "customColors", "removeBranding", "customCSS",
      "cartPage", "customUpload", "abTesting", "tagTargeting",
      "geolocation", "translations", "scheduling",
    ];
    for (const plan of Object.keys(PLAN_LIMITS)) {
      for (const key of expectedKeys) {
        expect(
          PLAN_LIMITS[plan],
          `Plan "${plan}" missing key "${key}"`
        ).toHaveProperty(key);
      }
    }
  });
});
