import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const HANDLED_TOPICS = new Set([
  "APP_UNINSTALLED",
  "APP_SUBSCRIPTIONS_UPDATE",
  "CUSTOMERS_DATA_REQUEST",
  "CUSTOMERS_REDACT",
  "SHOP_REDACT",
]);

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  // Surface unhandled topics so they show up in logs and monitoring
  if (!HANDLED_TOPICS.has(topic)) {
    console.warn(`Unhandled webhook topic "${topic}" for ${shop}`);
    return new Response("Unhandled webhook topic", { status: 404 });
  }

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
        // App does not store customer data — compliance-only ack
        break;
      case "CUSTOMERS_REDACT":
        // App does not store customer data — compliance-only ack
        break;
      case "SHOP_REDACT":
        await prisma.badgeConfig.deleteMany({ where: { shop } });
        break;
    }
  } catch (error) {
    console.error(`Webhook ${topic} failed for ${shop}:`, error);
    // Return 200 to prevent Shopify retry storms for transient DB errors
  }

  return new Response(null, { status: 200 });
};
