import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { syncMetafield, clearMetafield, shouldSync } from "../utils/sync-metafield";

/**
 * API endpoint to sync badge config to shop metafield.
 * Bypasses the embedded iframe — can be called directly.
 *
 * POST /api/sync-badges — syncs the current published config
 * GET  /api/sync-badges — returns current sync status
 */

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  if (!config) {
    return json({ synced: false, reason: "No badge config found" });
  }

  // Check if metafield exists
  try {
    const response = await admin.graphql(`{
      shop {
        metafield(namespace: "trust_badges", key: "config") {
          value
          updatedAt
        }
      }
    }`);
    const data = await response.json();
    const metafield = data.data?.shop?.metafield;

    return json({
      synced: !!metafield,
      configStatus: config.status || "draft",
      badgeCount: JSON.parse(config.badges || "[]").length,
      metafieldUpdatedAt: metafield?.updatedAt || null,
    });
  } catch (error) {
    return json({ synced: false, reason: error.message });
  }
};

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  if (!config) {
    return json({ success: false, error: "No badge config found. Create a badge first." }, { status: 404 });
  }

  // Force status to published for sync
  if (config.status !== "published") {
    await prisma.badgeConfig.update({
      where: { shop },
      data: { status: "published" },
    });
    config.status = "published";
  }

  try {
    await syncMetafield(admin, config);
    return json({
      success: true,
      message: "Badges synced to storefront!",
      badgeCount: JSON.parse(config.badges || "[]").length,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return json({
      success: false,
      error: `Sync failed: ${error.message}`,
    }, { status: 500 });
  }
};
