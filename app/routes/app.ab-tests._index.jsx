import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Banner,
  Divider,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { PLAN_LIMITS } from "../utils/badge-presets";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  const plan = config?.plan || "free";
  const limits = PLAN_LIMITS[plan];

  if (!limits.abTesting) {
    return json({ plan, tests: [], gated: true });
  }

  const tests = await prisma.aBTest.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ plan, tests, gated: false });
};

export default function ABTests() {
  const { plan, tests, gated } = useLoaderData();
  const navigate = useNavigate();

  if (gated) {
    return (
      <Page title="A/B Tests" backAction={{ content: "Dashboard", url: "/app" }}>
        <Layout>
          <Layout.Section>
            <Banner
              title="A/B Testing requires Essential or Professional plan"
              tone="warning"
              action={{ content: "Upgrade Now", url: "/app/billing" }}
            >
              <p>
                Test which trust badges convert better. Compare two badge
                configurations side-by-side and let real data decide the winner.
              </p>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  const statusTone = (status) => {
    if (status === "running") return "attention";
    if (status === "completed") return "success";
    return "info";
  };

  return (
    <Page
      title="A/B Tests"
      primaryAction={{
        content: "Create Test",
        onAction: () => navigate("/app/ab-tests/new"),
      }}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <BlockStack gap="500">
        <Banner tone="info">
          Test which badge configuration converts better. Create a test, let it
          run for at least 1,000 impressions per variant, then declare a winner.
        </Banner>

        {tests.length === 0 ? (
          <Card>
            <EmptyState
              heading="No A/B tests yet"
              action={{
                content: "Create your first test",
                onAction: () => navigate("/app/ab-tests/new"),
              }}
            >
              <p>
                Compare two badge configurations to see which one drives more
                add-to-cart conversions.
              </p>
            </EmptyState>
          </Card>
        ) : (
          <Layout>
            {tests.map((test) => {
              const controlRate =
                test.controlImpressions > 0
                  ? ((test.controlConversions / test.controlImpressions) * 100).toFixed(2)
                  : "0.00";
              const variantRate =
                test.variantImpressions > 0
                  ? ((test.variantConversions / test.variantImpressions) * 100).toFixed(2)
                  : "0.00";
              const totalImpressions =
                test.controlImpressions + test.variantImpressions;

              return (
                <Layout.Section key={test.id}>
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h2" variant="headingMd">
                          {test.name}
                        </Text>
                        <InlineStack gap="200">
                          <Badge tone={statusTone(test.status)}>
                            {test.status.charAt(0).toUpperCase() +
                              test.status.slice(1)}
                          </Badge>
                          {test.winnerId && (
                            <Badge tone="success">
                              Winner: {test.winnerId === "control" ? "Control" : "Variant"}
                            </Badge>
                          )}
                        </InlineStack>
                      </InlineStack>

                      <Divider />

                      <InlineStack gap="800" align="center">
                        <BlockStack gap="100" inlineAlign="center">
                          <Text variant="headingLg" fontWeight="bold">
                            {totalImpressions.toLocaleString()}
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Total Impressions
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100" inlineAlign="center">
                          <Text variant="headingLg" fontWeight="bold">
                            {controlRate}%
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Control Rate
                          </Text>
                        </BlockStack>
                        <BlockStack gap="100" inlineAlign="center">
                          <Text variant="headingLg" fontWeight="bold">
                            {variantRate}%
                          </Text>
                          <Text variant="bodySm" tone="subdued">
                            Variant Rate
                          </Text>
                        </BlockStack>
                      </InlineStack>

                      <Button
                        fullWidth
                        onClick={() => navigate(`/app/ab-tests/${test.id}`)}
                      >
                        View Details
                      </Button>
                    </BlockStack>
                  </Card>
                </Layout.Section>
              );
            })}
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
