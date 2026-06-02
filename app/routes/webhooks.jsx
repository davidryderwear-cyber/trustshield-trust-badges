import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// Remove every row tied to a shop (app uninstall + GDPR shop redaction).
async function deleteAllShopData(shop) {
  const tests = await prisma.aBTest.findMany({ where: { shop }, select: { id: true } });
  const testIds = tests.map((t) => t.id);
  if (testIds.length) {
    await prisma.aBEvent.deleteMany({ where: { testId: { in: testIds } } });
  }
  await prisma.aBTest.deleteMany({ where: { shop } });
  await prisma.customBadge.deleteMany({ where: { shop } });
  await prisma.badgeConfig.deleteMany({ where: { shop } });
  await prisma.session.deleteMany({ where: { shop } });
}

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
        await deleteAllShopData(shop);
        break;
      case "APP_SUBSCRIPTIONS_UPDATE": {
        // Drive plan entitlement off the authenticated webhook. Shopify sends
        // the status in upper case (ACTIVE, CANCELLED, ...), so normalize it.
        const sub = payload?.app_subscription;
        const status = (sub?.status || "").toLowerCase();
        if (status === "active") {
          const planMap = { Starter: "starter", Essential: "essential", Professional: "professional" };
          const newPlan = planMap[sub?.name];
          if (newPlan) {
            await prisma.badgeConfig.updateMany({ where: { shop }, data: { plan: newPlan } });
          }
        } else if (["cancelled", "expired", "frozen", "declined"].includes(status)) {
          await prisma.badgeConfig.updateMany({ where: { shop }, data: { plan: "free" } });
        }
        break;
      }
      case "CUSTOMERS_DATA_REQUEST":
        // App does not store customer data — compliance-only ack
        break;
      case "CUSTOMERS_REDACT":
        // App does not store customer data — compliance-only ack
        break;
      case "SHOP_REDACT":
        await deleteAllShopData(shop);
        break;
    }
  } catch (error) {
    console.error(`Webhook ${topic} failed for ${shop}:`, error);
    // Return 200 to prevent Shopify retry storms for transient DB errors
  }

  return new Response(null, { status: 200 });
};
