import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Button,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLAN_LIMITS } from "../utils/badge-presets";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  const plan = config?.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return json({ plan, limits });
};

export default function ChooseBadgeType() {
  const { plan, limits } = useLoaderData();
  const navigate = useNavigate();

  const badgeTypes = [
    {
      key: "product",
      title: "Product page",
      description: "Block in product page below add to cart button.",
      icon: (
        <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
          <rect x="2" y="2" width="76" height="56" rx="4" stroke="#c5c8d1" strokeWidth="1.5" fill="#fafafa" />
          <rect x="8" y="8" width="30" height="35" rx="2" fill="#e3e5e7" />
          <rect x="44" y="8" width="28" height="6" rx="1" fill="#d0d5dd" />
          <rect x="44" y="18" width="20" height="4" rx="1" fill="#e3e5e7" />
          <rect x="44" y="26" width="28" height="8" rx="2" fill="#333" />
          <rect x="44" y="38" width="7" height="7" rx="1" fill="#c5c8d1" />
          <rect x="54" y="38" width="7" height="7" rx="1" fill="#c5c8d1" />
          <rect x="64" y="38" width="7" height="7" rx="1" fill="#c5c8d1" />
        </svg>
      ),
      available: true,
      onClick: () => navigate("/app/badges?pageType=product"),
    },
    {
      key: "cart",
      title: "Cart page",
      description: "Add a badge block to cart page or cart drawer.",
      icon: (
        <svg width="80" height="60" viewBox="0 0 80 60" fill="none">
          <rect x="2" y="2" width="76" height="56" rx="4" stroke="#c5c8d1" strokeWidth="1.5" fill="#fafafa" />
          <path d="M20 15 L30 15 L35 35 L15 35 Z" stroke="#c5c8d1" strokeWidth="1.5" fill="none" />
          <rect x="18" y="38" width="20" height="4" rx="1" fill="#d0d5dd" />
          <rect x="45" y="10" width="26" height="35" rx="2" stroke="#c5c8d1" strokeWidth="1" fill="#fff" />
          <rect x="48" y="14" width="20" height="4" rx="1" fill="#e3e5e7" />
          <rect x="48" y="22" width="20" height="4" rx="1" fill="#e3e5e7" />
          <rect x="48" y="30" width="20" height="8" rx="2" fill="#333" />
        </svg>
      ),
      available: limits.cartPage,
      gatedPlan: "Essential",
      onClick: () => navigate("/app/badges?pageType=cart"),
    },
  ];

  return (
    <Page
      title="Choose badge type"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <Layout>
        {badgeTypes.map((type) => (
          <Layout.Section key={type.key} variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Box
                  padding="600"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack align="center">{type.icon}</InlineStack>
                </Box>

                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    {type.title}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {type.description}
                  </Text>
                  {!type.available && (
                    <Text as="p" variant="bodySm" tone="caution">
                      Available with {type.gatedPlan} plan.{" "}
                      <Button variant="plain" url="/app/billing">
                        Upgrade now.
                      </Button>
                    </Text>
                  )}
                </BlockStack>

                <Button
                  fullWidth
                  onClick={type.onClick}
                  disabled={!type.available}
                >
                  Select this badge type
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        ))}
      </Layout>
    </Page>
  );
}
