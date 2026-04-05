import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  InlineStack,
  Banner,
  Button,
  Divider,
  Badge,
  ProgressBar,
  Icon,
  Box,
  Link,
  Collapsible,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.upsert({
    where: { shop },
    update: {},
    create: { shop, badges: "[]" },
  });

  let badges;
  try {
    badges = JSON.parse(config.badges);
  } catch {
    badges = [];
  }

  // Build the theme editor URL for enabling the app embed
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps`;

  const badgeTypeLabels = {
    icon_block: "Icon Block",
    single_banner: "Single Banner",
    minimal_icons: "Minimal Icons",
    payment_icons: "Payment Icons",
  };

  const pageTypeLabels = {
    product: "Product Page",
    cart: "Cart Page",
  };

  return json({
    shop,
    badgeCount: badges.length,
    plan: config.plan,
    showOnProduct: config.showOnProduct,
    showOnCart: config.showOnCart,
    showOnHome: config.showOnHome,
    themeEditorUrl,
    badgeBlock: {
      name: config.badgeName || "My Trust Badges",
      status: config.status || "published",
      badgeType: badgeTypeLabels[config.badgeType] || "Icon Block",
      pageType: pageTypeLabels[config.pageType] || "Product Page",
      count: badges.length,
    },
  });
};

// ---------------------------------------------------------------------------
// Setup Guide Step Component
// ---------------------------------------------------------------------------
function SetupStep({ number, title, description, completed, action, children }) {
  return (
    <Box
      padding="400"
      background={completed ? "bg-surface-success" : "bg-surface"}
      borderRadius="200"
    >
      <InlineStack gap="400" blockAlign="start" wrap={false}>
        {/* Step indicator */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: completed ? "#008060" : "#e3e5e7",
            color: completed ? "#fff" : "#6d7175",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {completed ? (
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.5 13.5L3.5 9.5L2 11L7.5 16.5L18 6L16.5 4.5L7.5 13.5Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            number
          )}
        </div>

        {/* Content */}
        <BlockStack gap="200">
          <Text as="h3" variant="headingSm" fontWeight="semibold">
            {title}
          </Text>
          {description && (
            <Text as="p" variant="bodySm" tone="subdued">
              {description}
            </Text>
          )}
          {!completed && action && (
            <Box paddingBlockStart="100">
              <Button
                size="slim"
                variant={action.primary ? "primary" : undefined}
                onClick={action.onAction}
                url={action.url}
                external={action.external}
              >
                {action.content}
              </Button>
            </Box>
          )}
          {children}
        </BlockStack>
      </InlineStack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Index() {
  const {
    shop,
    badgeCount,
    plan,
    showOnProduct,
    showOnCart,
    showOnHome,
    themeEditorUrl,
    badgeBlock,
  } = useLoaderData();
  const navigate = useNavigate();

  const [guideOpen, setGuideOpen] = useState(true);
  const [embedConfirmed, setEmbedConfirmed] = useState(false);

  // Setup steps completion
  const step1Done = embedConfirmed;
  const step2Done = badgeCount > 0;
  const step3Done = step1Done && step2Done && (showOnProduct || showOnHome);
  const completedSteps = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const totalSteps = 3;
  const progress = Math.round((completedSteps / totalSteps) * 100);
  const allDone = completedSteps === totalSteps;

  const storePreviewUrl = `https://${shop}`;

  return (
    <Page title="TrustShield Trust Badges">
      <BlockStack gap="500">
        {/* ── Setup Guide ── */}
        {!allDone && (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    Setup guide
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Follow these steps to start using TrustShield. For help, check
                    out our{" "}
                    <Link url="https://trustshield.app/docs" external>
                      documentation
                    </Link>
                    .
                  </Text>
                </BlockStack>
                <Button
                  variant="plain"
                  onClick={() => setGuideOpen(!guideOpen)}
                >
                  {guideOpen ? "Hide" : "Show"}
                </Button>
              </InlineStack>

              {/* Progress */}
              <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                  {completedSteps} / {totalSteps} steps completed
                </Text>
                <ProgressBar progress={progress} size="small" tone="primary" />
              </BlockStack>

              <Collapsible open={guideOpen}>
                <BlockStack gap="300">
                  {/* Step 1: Activate app embed */}
                  <SetupStep
                    number={1}
                    title="Activate app embed in Shopify"
                    description={
                      step1Done
                        ? "App embed is active!"
                        : "Enable TrustShield in your theme's app embeds so badges appear on your store."
                    }
                    completed={step1Done}
                    action={{
                      content: "Activate in theme editor",
                      url: themeEditorUrl,
                      external: true,
                      primary: true,
                    }}
                  >
                    {!step1Done && (
                      <Box paddingBlockStart="100">
                        <Button
                          variant="plain"
                          size="slim"
                          onClick={() => setEmbedConfirmed(true)}
                        >
                          I've activated it
                        </Button>
                      </Box>
                    )}
                  </SetupStep>

                  {/* Step 2: Create your first badge */}
                  <SetupStep
                    number={2}
                    title="Create your first trust badge"
                    description={
                      step2Done
                        ? `You have ${badgeCount} badge${badgeCount > 1 ? "s" : ""} configured!`
                        : "Start by creating your first TrustShield badge and publishing it to your store."
                    }
                    completed={step2Done}
                    action={{
                      content: "Create a new badge",
                      onAction: () => navigate("/app/badges/new"),
                      primary: true,
                    }}
                  />

                  {/* Step 3: Confirm working */}
                  <SetupStep
                    number={3}
                    title="Confirm your badges are working properly"
                    description={
                      step3Done
                        ? "Your badges are live! Visit your store to see them."
                        : "Preview your store to make sure the trust badges appear correctly."
                    }
                    completed={step3Done}
                    action={{
                      content: "Preview your store",
                      url: storePreviewUrl,
                      external: true,
                    }}
                  />
                </BlockStack>
              </Collapsible>
            </BlockStack>
          </Card>
        )}

        {/* ── All Done Banner ── */}
        {allDone && (
          <Banner
            title="You're all set!"
            tone="success"
            onDismiss={() => {}}
          >
            <p>
              Your trust badges are active on your store. Keep optimizing with
              A/B tests and custom designs.
            </p>
          </Banner>
        )}

        {/* ── Your Badges ── */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingLg">
            Your Badges
          </Text>
          <Button
            variant="primary"
            onClick={() => navigate("/app/badges/new")}
          >
            Create new badge
          </Button>
        </InlineStack>

        <Layout>
          <Layout.Section>
            {/* Badge Block Card */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        {badgeBlock.name}
                      </Text>
                      <Badge
                        tone={
                          badgeBlock.status === "published"
                            ? "success"
                            : "info"
                        }
                      >
                        {badgeBlock.status === "published"
                          ? "Published"
                          : "Draft"}
                      </Badge>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {badgeBlock.pageType}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {" \u00B7 "}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {badgeBlock.badgeType}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {" \u00B7 "}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {badgeBlock.count} badge
                        {badgeBlock.count !== 1 ? "s" : ""}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                  <Badge tone={plan === "free" ? "info" : "success"}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
                  </Badge>
                </InlineStack>
                <Divider />
                <InlineStack gap="300">
                  <Button onClick={() => navigate("/app/badges")}>
                    Edit Badge
                  </Button>
                  <Button
                    url={`https://${shop}`}
                    external
                    variant="plain"
                  >
                    Preview on store
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <BlockStack gap="400">
              {/* Quick Actions */}
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Quick Actions
                  </Text>
                  <Divider />
                  <Button
                    fullWidth
                    onClick={() => navigate("/app/badges")}
                  >
                    Edit Badges
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => navigate("/app/ab-tests")}
                  >
                    A/B Tests
                  </Button>
                  <Button
                    fullWidth
                    url={storePreviewUrl}
                    external
                  >
                    Preview Store
                  </Button>
                </BlockStack>
              </Card>

              {/* Upgrade CTA */}
              {plan === "free" && (
                <Card>
                  <BlockStack gap="300">
                    <Text as="h2" variant="headingMd">
                      Upgrade to Starter
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Unlimited badges, custom uploads, custom colors, and
                      remove branding.
                    </Text>
                    <Button
                      variant="primary"
                      tone="success"
                      onClick={() => navigate("/app/billing")}
                    >
                      Start Free Trial - $6.99/mo
                    </Button>
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
