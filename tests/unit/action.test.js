import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticate } from "../../app/shopify.server";
import prisma from "../../app/db.server";

vi.mock("../../app/shopify.server", () => ({
  authenticate: {
    admin: vi.fn(),
  },
}));

vi.mock("../../app/db.server", () => ({
  default: {
    badgeConfig: { findUnique: vi.fn(), upsert: vi.fn() },
    customBadge: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../../app/utils/sync-metafield", () => ({
  syncMetafield: vi.fn(),
  clearMetafield: vi.fn(),
  shouldSync: vi.fn(),
  transformBadges: vi.fn(),
  buildConfigPayload: vi.fn(),
}));

const { action } = await import("../../app/routes/app.badges.jsx");

function buildRequest(entries) {
  const formData = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    formData.set(k, v);
  }
  return new Request("http://localhost/app/badges", {
    method: "POST",
    body: formData,
  });
}

function validSaveData(overrides = {}) {
  return JSON.stringify({
    badges: [
      { id: "1", iconKey: "secure_checkout", label: "Checkout", type: "preset", enabled: true },
    ],
    layout: "horizontal",
    position: "below_add_to_cart",
    alignment: "center",
    showOnProduct: true,
    showOnCart: false,
    showOnHome: false,
    iconSize: 32,
    iconColor: "#333333",
    textColor: "#202223",
    fontSize: 16,
    spacing: 12,
    maxWidth: 600,
    customCSS: "",
    bgColor: "#ffffff",
    bgGradient: false,
    bgColorEnd: "#f4f6f8",
    cornerRadius: 8,
    borderSize: 0,
    borderColor: "#c5c8d1",
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 20,
    marginBottom: 20,
    iconBgColor: "#ffffff",
    iconCornerRadius: 4,
    useOriginalIconColor: false,
    subtitleFontSize: 14,
    subtitleColor: "#96a4b6",
    targetType: "all",
    targetIds: [],
    status: "draft",
    badgeName: "Test Badge",
    badgeType: "icon_block",
    titleAboveIcons: "",
    titleGap: 12,
    ...overrides,
  });
}

describe("action — save intent", () => {
  beforeEach(() => {
    authenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: {
        graphql: vi.fn().mockResolvedValue({
          json: () => Promise.resolve({
            data: {
              shop: { id: "gid://shopify/Shop/1" },
              metafieldsSet: { metafields: [{ id: "gid://shopify/Metafield/1" }], userErrors: [] },
            },
          }),
        }),
      },
    });
    prisma.badgeConfig.findUnique.mockResolvedValue({ plan: "free" });
    prisma.badgeConfig.upsert.mockResolvedValue({});
  });

  it("returns success for valid data", async () => {
    const request = buildRequest({ intent: "save", data: validSaveData() });
    const response = await action({ request });
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("returns 400 for invalid JSON", async () => {
    const request = buildRequest({ intent: "save", data: "not json" });
    const response = await action({ request });
    expect(response.status).toBe(400);
  });

  it("returns 400 when badges is not an array", async () => {
    const request = buildRequest({
      intent: "save",
      data: JSON.stringify({ badges: "not array" }),
    });
    const response = await action({ request });
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid iconKey", async () => {
    const data = validSaveData({
      badges: [{ id: "1", iconKey: "nonexistent_icon", label: "Bad", type: "preset", enabled: true }],
    });
    const request = buildRequest({ intent: "save", data });
    const response = await action({ request });
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Invalid badge icon");
  });

  it("returns 400 for label exceeding 100 chars", async () => {
    const data = validSaveData({
      badges: [{ id: "1", iconKey: "secure_checkout", label: "x".repeat(101), type: "preset", enabled: true }],
    });
    const request = buildRequest({ intent: "save", data });
    const response = await action({ request });
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("labels must be under 100");
  });

  it("returns 403 when exceeding free plan badge limit", async () => {
    const badges = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      iconKey: "secure_checkout",
      label: `Badge ${i}`,
      type: "preset",
      enabled: true,
    }));
    const data = validSaveData({ badges });
    const request = buildRequest({ intent: "save", data });
    const response = await action({ request });
    expect(response.status).toBe(403);
  });

  it("clamps iconSize to max 80", async () => {
    const data = validSaveData({ iconSize: 999 });
    const request = buildRequest({ intent: "save", data });
    await action({ request });
    const upsertCall = prisma.badgeConfig.upsert.mock.calls[0][0];
    expect(upsertCall.update.iconSize).toBe(80);
  });

  it("clamps fontSize to range 10-28", async () => {
    const data = validSaveData({ fontSize: 50 });
    const request = buildRequest({ intent: "save", data });
    await action({ request });
    const upsertCall = prisma.badgeConfig.upsert.mock.calls[0][0];
    expect(upsertCall.update.fontSize).toBe(28);
  });

  it("falls back to default for invalid hex color", async () => {
    const data = validSaveData({ iconColor: "not-a-color" });
    const request = buildRequest({ intent: "save", data });
    await action({ request });
    const upsertCall = prisma.badgeConfig.upsert.mock.calls[0][0];
    expect(upsertCall.update.iconColor).toBe("#333333");
  });

  it("sanitizes CSS injection in customCSS", async () => {
    const data = validSaveData({ customCSS: "body { background: url(evil.com) }" });
    const request = buildRequest({ intent: "save", data });
    await action({ request });
    const upsertCall = prisma.badgeConfig.upsert.mock.calls[0][0];
    expect(upsertCall.update.customCSS).toContain("/* blocked */");
  });

  it("allows custom badge type to skip iconKey validation", async () => {
    const data = validSaveData({
      badges: [{ id: "1", type: "custom", label: "My Logo", imageUrl: "https://img.com/logo.png", enabled: true }],
    });
    const request = buildRequest({ intent: "save", data });
    const response = await action({ request });
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});

describe("action — upload_image intent", () => {
  beforeEach(() => {
    authenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
  });

  it("creates customBadge record", async () => {
    prisma.customBadge.create.mockResolvedValue({
      id: "cb-1",
      name: "Logo",
      imageUrl: "https://img.com/logo.png",
    });
    const request = buildRequest({
      intent: "upload_image",
      imageUrl: "https://img.com/logo.png",
      imageName: "Logo",
    });
    const response = await action({ request });
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(prisma.customBadge.create).toHaveBeenCalled();
  });

  it("returns 400 when imageUrl is missing", async () => {
    const request = buildRequest({ intent: "upload_image", imageName: "Logo" });
    const response = await action({ request });
    expect(response.status).toBe(400);
  });
});

describe("action — delete_custom intent", () => {
  beforeEach(() => {
    authenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
  });

  it("deletes the custom badge", async () => {
    const request = buildRequest({ intent: "delete_custom", badgeId: "cb-1" });
    await action({ request });
    expect(prisma.customBadge.deleteMany).toHaveBeenCalledWith({
      where: { id: "cb-1", shop: "test-shop.myshopify.com" },
    });
  });
});

describe("action — unknown intent", () => {
  beforeEach(() => {
    authenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
  });

  it("returns 400", async () => {
    const request = buildRequest({ intent: "unknown" });
    const response = await action({ request });
    expect(response.status).toBe(400);
  });
});
