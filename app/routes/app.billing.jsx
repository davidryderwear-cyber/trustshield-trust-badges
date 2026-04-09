import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Divider,
  Box,
  ProgressBar,
  Banner,
} from "@shopify/polaris";
import { authenticate, PLANS } from "../shopify.server";
import prisma from "../db.server";

const PAID_PLANS = [PLANS.STARTER, PLANS.ESSENTIAL, PLANS.PROFESSIONAL];

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  let currentPlan = config?.plan || "free";

  let hasActiveSubscription = false;
  let activePlanName = null;
  try {
    const billingCheck = await billing.check({
      plans: PAID_PLANS,
      isTest: true,
    });
    hasActiveSubscription = billingCheck.hasActivePayment;
    activePlanName = billingCheck.appSubscriptions?.[0]?.name;

    if (hasActiveSubscription && activePlanName) {
      const planMap = {
        [PLANS.STARTER]: "starter",
        [PLANS.ESSENTIAL]: "essential",
        [PLANS.PROFESSIONAL]: "professional",
      };
      const newPlan = planMap[activePlanName] || currentPlan;
      if (newPlan !== currentPlan) {
        await prisma.badgeConfig.upsert({
          where: { shop },
          update: { plan: newPlan },
          create: { shop, plan: newPlan },
        });
        currentPlan = newPlan;
      }
    } else if (!hasActiveSubscription && currentPlan !== "free") {
      await prisma.badgeConfig.update({
        where: { shop },
        data: { plan: "free" },
      });
      currentPlan = "free";
    }
  } catch (e) {
    console.error("Billing check failed:", e);
  }

  return json({ currentPlan, hasActiveSubscription, activePlanName });
};

export const action = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const planKey = formData.get("plan");

  const planMap = {
    starter: PLANS.STARTER,
    essential: PLANS.ESSENTIAL,
    professional: PLANS.PROFESSIONAL,
  };

  const planName = planMap[planKey];
  if (!planName) {
    return json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.SHOPIFY_APP_URL || `https://${shop}/admin/apps`;

  try {
    await billing.require({
      plans: [planName],
      isTest: true,
      onFailure: async () => {
        return billing.request({
          plan: planName,
          isTest: true,
          returnUrl: `${appUrl}/app/billing`,
        });
      },
    });

    // If we get here, the user already has this plan active
    await prisma.badgeConfig.upsert({
      where: { shop },
      update: { plan: planKey },
      create: { shop, plan: planKey },
    });

    return json({ success: true });
  } catch (error) {
    // billing.request() throws a Response redirect to Shopify's approval page
    // — let it through instead of catching it as an error
    if (error instanceof Response) {
      throw error;
    }
    console.error("Billing request failed:", error);
    return json({ error: "Billing request failed" }, { status: 500 });
  }
};

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------
const plans = [
  {
    name: "Free",
    key: "free",
    price: "$0",
    period: "forever",
    features: [
      "1 product page block",
      "Up to 3 icons per block",
      "36 built-in icons",
      "Product page display",
      "Home page display",
      "Horizontal & vertical layouts",
    ],
    limitations: [
      "No custom icon uploads",
      "No custom colors",
      "No cart page display",
      "\"Powered by\" branding shown",
    ],
  },
  {
    name: "Starter",
    key: "starter",
    price: "$6.99",
    period: "/month",
    trial: "7-day free trial",
    features: [
      "Unlimited product page blocks",
      "Unlimited icons per block",
      "36 built-in icons",
      "Custom icon uploads",
      "Custom icon & text colors",
      "Remove \"Powered by\" branding",
      "Product & home page display",
      "All layouts (horizontal, vertical, grid)",
    ],
    limitations: [
      "No cart page display",
      "No tag targeting",
      "No geolocation targeting",
    ],
  },
  {
    name: "Essential",
    key: "essential",
    price: "$9.99",
    period: "/month",
    popular: true,
    trial: "7-day free trial",
    features: [
      "Everything in Starter, plus:",
      "Cart page / cart drawer badges",
      "Product tag targeting",
      "Geolocation targeting",
      "Translations support",
      "A/B testing",
      "Priority support",
    ],
    limitations: [
      "No custom CSS",
    ],
  },
  {
    name: "Professional",
    key: "professional",
    price: "$29.99",
    period: "/month",
    trial: "7-day free trial",
    features: [
      "Everything in Essential, plus:",
      "Custom CSS injection",
      "Advanced analytics dashboard",
      "Dedicated support",
      "Early access to new features",
    ],
    limitations: [],
  },
];

// Plan order for upgrade/downgrade logic
const planOrder = ["free", "starter", "essential", "professional"];

export default function Billing() {
  const { currentPlan } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isUpgrading = navigation.state === "submitting";

  const currentIndex = planOrder.indexOf(currentPlan);

  const handleUpgrade = (planKey) => {
    const formData = new FormData();
    formData.set("plan", planKey);
    submit(formData, { method: "post" });
  };

  return (
    <Page
      title="Pricing Plans"
      subtitle="Choose the plan that fits your store"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <BlockStack gap="500">
        <Layout>
          {plans.map((plan) => {
            const planIndex = planOrder.indexOf(plan.key);
            const isCurrent = currentPlan === plan.key;
            const isDowngrade = planIndex < currentIndex;
            const isUpgrade = planIndex > currentIndex;

            return (
              <Layout.Section key={plan.key}>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingLg">{plan.name}</Text>
                      <InlineStack gap="200">
                        {plan.popular && <Badge tone="attention">Most Popular</Badge>}
                        {isCurrent && <Badge tone="success">Current Plan</Badge>}
                      </InlineStack>
                    </InlineStack>

                    <InlineStack gap="100" blockAlign="baseline">
                      <Text as="p" variant="heading2xl" fontWeight="bold">
                        {plan.price}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {plan.period}
                      </Text>
                    </InlineStack>

                    {plan.trial && (
                      <Text as="p" variant="bodySm" tone="success">
                        {plan.trial}
                      </Text>
                    )}

                    <Divider />

                    <BlockStack gap="200">
                      {plan.features.map((feature, i) => (
                        <InlineStack key={i} gap="200" blockAlign="start">
                          <span style={{ color: "#008060", fontWeight: 600 }}>+</span>
                          <Text as="p" variant="bodyMd">{feature}</Text>
                        </InlineStack>
                      ))}
                      {plan.limitations.map((limitation, i) => (
                        <InlineStack key={`l-${i}`} gap="200" blockAlign="start">
                          <span style={{ color: "#8c9196" }}>-</span>
                          <Text as="p" variant="bodyMd" tone="subdued">{limitation}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>

                    <Divider />

                    {isCurrent ? (
                      <Button disabled fullWidth>Current Plan</Button>
                    ) : plan.key === "free" ? (
                      <Button fullWidth disabled>Included</Button>
                    ) : (
                      <Button
                        variant="primary"
                        tone={plan.popular ? "success" : undefined}
                        fullWidth
                        onClick={() => handleUpgrade(plan.key)}
                        loading={isUpgrading}
                      >
                        {currentPlan === "free" ? "Start FREE 7-day Trial" : isUpgrade ? "Upgrade" : "Switch Plan"}
                      </Button>
                    )}
                  </BlockStack>
                </Card>
              </Layout.Section>
            );
          })}
        </Layout>

        {/* Money-back guarantee */}
        <Box padding="400">
          <BlockStack inlineAlign="center" gap="200">
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              30-day money-back guarantee on all paid plans. Cancel anytime from your Shopify admin.
            </Text>
          </BlockStack>
        </Box>
      </BlockStack>
    </Page>
  );
}
