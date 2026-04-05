import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  try {
    switch (topic) {
      case "APP_UNINSTALLED":
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.badgeConfig.deleteMany({ where: { shop } });
        break;
      case "APP_SUBSCRIPTIONS_UPDATE":
        // Sync billing status when subscription changes
        if (payload?.app_subscription?.status === "cancelled" ||
            payload?.app_subscription?.status === "expired" ||
            payload?.app_subscription?.status === "frozen") {
          await prisma.badgeConfig.updateMany({
            where: { shop },
            data: { plan: "free" },
          });
        }
        break;
      case "CUSTOMERS_DATA_REQUEST":
        // App does not store customer data
        break;
      case "CUSTOMERS_REDACT":
        // App does not store customer data
        break;
      case "SHOP_REDACT":
        await prisma.badgeConfig.deleteMany({ where: { shop } });
        break;
      default:
        throw new Response("Unhandled webhook topic", { status: 404 });
    }
  } catch (error) {
    console.error(`Webhook ${topic} failed for ${shop}:`, error);
    // Return 200 to prevent Shopify retry storms
  }

  return new Response(null, { status: 200 });
};
