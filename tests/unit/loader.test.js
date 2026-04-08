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
    badgeConfig: { upsert: vi.fn() },
    customBadge: { findMany: vi.fn() },
  },
}));

const { loader } = await import("../../app/routes/app.badges.jsx");

describe("loader", () => {
  beforeEach(() => {
    authenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
    });
    prisma.customBadge.findMany.mockResolvedValue([]);
  });

  it("returns config with parsed badges", async () => {
    const badges = [{ id: "1", iconKey: "secure_checkout", label: "Test", type: "preset", enabled: true }];
    prisma.badgeConfig.upsert.mockResolvedValue({
      id: "cfg-1",
      shop: "test-shop.myshopify.com",
      badges: JSON.stringify(badges),
      status: "published",
      badgeName: "My Badges",
      badgeType: "icon_block",
      startsAt: null,
      endsAt: null,
    });

    const request = new Request("http://localhost/app/badges");
    const response = await loader({ request });
    const data = await response.json();

    expect(data.config.badges).toEqual(badges);
    expect(data.config.configId).toBe("cfg-1");
    expect(data.config.badgeName).toBe("My Badges");
  });

  it("returns empty badges array when JSON is invalid", async () => {
    prisma.badgeConfig.upsert.mockResolvedValue({
      id: "cfg-1",
      shop: "test-shop.myshopify.com",
      badges: "not valid json",
      status: "draft",
      badgeName: "",
      badgeType: "",
      startsAt: null,
      endsAt: null,
    });

    const request = new Request("http://localhost/app/badges");
    const response = await loader({ request });
    const data = await response.json();

    expect(data.config.badges).toEqual([]);
  });

  it("returns customBadges list", async () => {
    const customBadges = [{ id: "cb-1", name: "Custom", imageUrl: "https://img.com/x.png" }];
    prisma.customBadge.findMany.mockResolvedValue(customBadges);
    prisma.badgeConfig.upsert.mockResolvedValue({
      id: "cfg-1",
      shop: "test-shop.myshopify.com",
      badges: "[]",
      status: "draft",
      badgeName: "",
      badgeType: "",
      startsAt: null,
      endsAt: null,
    });

    const request = new Request("http://localhost/app/badges");
    const response = await loader({ request });
    const data = await response.json();

    expect(data.customBadges).toEqual(customBadges);
  });
});
