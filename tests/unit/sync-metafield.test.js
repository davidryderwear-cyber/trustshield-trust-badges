import { describe, it, expect } from "vitest";
import {
  shouldSync,
  transformBadges,
  buildConfigPayload,
} from "../../app/utils/sync-metafield.js";

describe("shouldSync", () => {
  it("returns false for draft status", () => {
    expect(shouldSync({ status: "draft" })).toBe(false);
  });

  it("returns true for published status with no scheduling", () => {
    expect(shouldSync({ status: "published" })).toBe(true);
  });

  it("returns false when startsAt is in the future", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(shouldSync({ status: "published", startsAt: future })).toBe(false);
  });

  it("returns false when endsAt is in the past", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(shouldSync({ status: "published", endsAt: past })).toBe(false);
  });

  it("returns true when within scheduling window", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      shouldSync({ status: "published", startsAt: past, endsAt: future })
    ).toBe(true);
  });
});

describe("transformBadges", () => {
  it("parses JSON string input", () => {
    const input = JSON.stringify([
      { label: "Test", iconKey: "secure_checkout", type: "preset", enabled: true },
    ]);
    const result = transformBadges(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Test");
  });

  it("accepts array input directly", () => {
    const input = [
      { label: "Test", iconKey: "secure_checkout", type: "preset", enabled: true },
    ];
    const result = transformBadges(input);
    expect(result).toHaveLength(1);
  });

  it("filters out disabled badges", () => {
    const input = [
      { label: "A", iconKey: "secure_checkout", type: "preset", enabled: true },
      { label: "B", iconKey: "ssl_secure", type: "preset", enabled: false },
    ];
    const result = transformBadges(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("A");
  });

  it("resolves SVG from BADGE_ICONS for preset type", () => {
    const input = [
      { label: "Lock", iconKey: "secure_checkout", type: "preset", enabled: true },
    ];
    const result = transformBadges(input);
    expect(result[0].svg).toContain("<svg");
    expect(result[0].imageUrl).toBe("");
  });

  it("returns imageUrl for custom type badges", () => {
    const input = [
      { label: "Custom", type: "custom", imageUrl: "https://img.com/badge.png", enabled: true },
    ];
    const result = transformBadges(input);
    expect(result[0].svg).toBe("");
    expect(result[0].imageUrl).toBe("https://img.com/badge.png");
  });

  it("returns empty array for invalid JSON", () => {
    expect(transformBadges("not json")).toEqual([]);
  });

  it("returns empty array for non-string, non-array input", () => {
    expect(transformBadges(42)).toEqual([]);
    expect(transformBadges(null)).toEqual([]);
  });
});

describe("buildConfigPayload", () => {
  it("includes all expected fields with defaults", () => {
    const payload = buildConfigPayload({});
    expect(payload.badgeType).toBe("icon_block");
    expect(payload.layout).toBe("horizontal");
    expect(payload.alignment).toBe("center");
    expect(payload.iconSize).toBe(32);
    expect(payload.iconColor).toBe("#333333");
    expect(payload.textColor).toBe("#202223");
    expect(payload.fontSize).toBe(16);
    expect(payload.spacing).toBe(12);
    expect(payload.maxWidth).toBe(600);
    expect(payload.showOnProduct).toBe(true);
    expect(payload.showOnCart).toBe(false);
    expect(payload.showOnHome).toBe(false);
    expect(payload.cornerRadius).toBe(8);
    expect(payload.borderSize).toBe(0);
    expect(payload.borderColor).toBe("#c5c8d1");
    expect(payload.iconBgColor).toBe("#ffffff");
    expect(payload.subtitleFontSize).toBe(14);
    expect(payload.subtitleColor).toBe("#96a4b6");
    expect(payload.targetType).toBe("all");
  });

  it("uses provided config values over defaults", () => {
    const payload = buildConfigPayload({
      badgeType: "single_banner",
      layout: "vertical",
      iconSize: 48,
      borderColor: "#ff0000",
    });
    expect(payload.badgeType).toBe("single_banner");
    expect(payload.layout).toBe("vertical");
    expect(payload.iconSize).toBe(48);
    expect(payload.borderColor).toBe("#ff0000");
  });

  it("transforms badges from config", () => {
    const payload = buildConfigPayload({
      badges: JSON.stringify([
        { label: "Test", iconKey: "secure_checkout", type: "preset", enabled: true },
      ]),
    });
    expect(payload.badges).toHaveLength(1);
    expect(payload.badges[0].label).toBe("Test");
  });
});
