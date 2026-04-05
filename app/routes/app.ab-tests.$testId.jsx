import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData } from "@remix-run/react";
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
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { BADGE_ICONS } from "../utils/badge-presets";
import { syncMetafield } from "../utils/sync-metafield";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const test = await prisma.aBTest.findUnique({ where: { id: params.testId } });
  if (!test || test.shop !== shop) {
    throw new Response("Test not found", { status: 404 });
  }

  let controlBadges = [];
  let variantBadges = [];
  try {
    const cc = JSON.parse(test.controlConfig);
    controlBadges = JSON.parse(cc.badges);
  } catch {}
  try {
    const vc = JSON.parse(test.variantConfig);
    variantBadges = JSON.parse(vc.badges);
  } catch {}

  return json({ test, controlBadges, variantBadges });
};

export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const test = await prisma.aBTest.findUnique({ where: { id: params.testId } });
  if (!test || test.shop !== shop) {
    return json({ error: "Test not found" }, { status: 404 });
  }

  if (intent === "start") {
    // Use updateMany for optimistic locking
    const updated = await prisma.aBTest.updateMany({
      where: { id: test.id, status: "draft" },
      data: { status: "running", startedAt: new Date() },
    });
    if (updated.count === 0) {
      return json({ error: "Test is not in draft status or was already started" }, { status: 409 });
    }

    // Sync metafield with A/B test data
    const config = await prisma.badgeConfig.findUnique({ where: { shop } });
    const updatedTest = await prisma.aBTest.findUnique({ where: { id: test.id } });
    try {
      await syncMetafield(admin, config, updatedTest);
    } catch (error) {
      // Revert status if sync fails
      await prisma.aBTest.update({ where: { id: test.id }, data: { status: "draft", startedAt: null } });
      console.error("Failed to sync A/B test metafield:", error);
      return json({ error: "Failed to sync badges to storefront. Test not started." }, { status: 500 });
    }

    return json({ success: true, message: "Test started! Visitors will now see different badge sets." });
  }

  if (intent === "stop") {
    const updated = await prisma.aBTest.updateMany({
      where: { id: test.id, status: "running" },
      data: { status: "completed", endedAt: new Date() },
    });
    if (updated.count === 0) {
      return json({ error: "Test is not running" }, { status: 400 });
    }

    // Remove A/B test from metafield (revert to control)
    const config = await prisma.badgeConfig.findUnique({ where: { shop } });
    try {
      await syncMetafield(admin, config, null);
    } catch (error) {
      console.error("Failed to sync metafield on stop:", error);
      return json({ error: "Test stopped but storefront sync failed. Badges may still show test variants until next save." }, { status: 500 });
    }

    return json({ success: true, message: "Test stopped. Your original badges are restored." });
  }

  if (intent === "declare_winner") {
    const winner = formData.get("winner");
    if (!["control", "variant"].includes(winner)) {
      return json({ error: "Invalid winner" }, { status: 400 });
    }

    if (winner === "variant") {
      // Apply full variant config to the main BadgeConfig
      let variantConfig;
      try {
        variantConfig = JSON.parse(test.variantConfig);
      } catch {
        return json({ error: "Variant config is corrupted" }, { status: 500 });
      }

      const updateData = { badges: variantConfig.badges };
      if (variantConfig.layout) updateData.layout = variantConfig.layout;
      if (variantConfig.iconSize) updateData.iconSize = variantConfig.iconSize;
      if (variantConfig.iconColor) updateData.iconColor = variantConfig.iconColor;
      if (variantConfig.textColor) updateData.textColor = variantConfig.textColor;
      if (variantConfig.fontSize) updateData.fontSize = variantConfig.fontSize;
      if (variantConfig.spacing) updateData.spacing = variantConfig.spacing;
      if (variantConfig.maxWidth) updateData.maxWidth = variantConfig.maxWidth;

      await prisma.badgeConfig.update({ where: { shop }, data: updateData });
    }

    await prisma.aBTest.update({
      where: { id: test.id },
      data: {
        winnerId: winner,
        status: "completed",
        endedAt: test.endedAt || new Date(),
      },
    });

    // Sync clean config (no A/B test)
    const config = await prisma.badgeConfig.findUnique({ where: { shop } });
    try {
      await syncMetafield(admin, config, null);
    } catch (error) {
      console.error("Failed to sync metafield on declare winner:", error);
    }

    return json({
      success: true,
      message: `${winner === "control" ? "Control" : "Variant"} declared as winner!`,
    });
  }

  if (intent === "delete") {
    if (test.status === "running") {
      return json({ error: "Stop the test before deleting" }, { status: 400 });
    }
    await prisma.aBEvent.deleteMany({ where: { testId: test.id } });
    await prisma.aBTest.delete({ where: { id: test.id } });
    return json({ success: true, redirect: "/app/ab-tests" });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};

export default function ABTestDetail() {
  const { test, controlBadges, variantBadges } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const isSubmitting = navigation.state === "submitting";

  if (actionData?.redirect) {
    window.location.href = actionData.redirect;
  }

  const controlRate =
    test.controlImpressions > 0
      ? ((test.controlConversions / test.controlImpressions) * 100).toFixed(2)
      : "0.00";
  const variantRate =
    test.variantImpressions > 0
      ? ((test.variantConversions / test.variantImpressions) * 100).toFixed(2)
      : "0.00";

  const controlWinning = Number(controlRate) >= Number(variantRate);
  const totalImpressions = test.controlImpressions + test.variantImpressions;

  const handleAction = (intent, extra = {}) => {
    const formData = new FormData();
    formData.set("intent", intent);
    Object.entries(extra).forEach(([k, v]) => formData.set(k, v));
    submit(formData, { method: "post" });
  };

  const statusTone =
    test.status === "running"
      ? "attention"
      : test.status === "completed"
        ? "success"
        : "info";

  return (
    <Page
      title={test.name}
      backAction={{ content: "A/B Tests", url: "/app/ab-tests" }}
      titleMetadata={
        <Badge tone={statusTone}>
          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
        </Badge>
      }
    >
      <BlockStack gap="500">
        {actionData?.message && (
          <Banner
            title={actionData.message}
            tone={actionData.error ? "critical" : "success"}
            onDismiss={() => {}}
          />
        )}

        {/* Actions */}
        <Card>
          <InlineStack gap="300" align="start">
            {test.status === "draft" && (
              <Button
                variant="primary"
                onClick={() => handleAction("start")}
                loading={isSubmitting}
              >
                Start Test
              </Button>
            )}
            {test.status === "running" && (
              <Button
                tone="critical"
                onClick={() => handleAction("stop")}
                loading={isSubmitting}
              >
                Stop Test
              </Button>
            )}
            {test.status !== "running" && (
              <Button
                tone="critical"
                onClick={() => handleAction("delete")}
                loading={isSubmitting}
              >
                Delete Test
              </Button>
            )}
          </InlineStack>
        </Card>

        {/* Results comparison */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Control
                  </Text>
                  {!controlWinning ? null : totalImpressions > 100 ? (
                    <Badge tone="success">Leading</Badge>
                  ) : null}
                </InlineStack>
                <Divider />
                <InlineStack gap="600" align="center">
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold">
                      {test.controlImpressions.toLocaleString()}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Impressions
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold">
                      {test.controlConversions.toLocaleString()}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Conversions
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold" tone={controlWinning && totalImpressions > 100 ? "success" : undefined}>
                      {controlRate}%
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Conv. Rate
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Divider />
                <InlineStack gap="300" align="center" wrap>
                  {controlBadges.slice(0, 6).map((badge, i) => (
                    <BlockStack key={i} gap="100" inlineAlign="center">
                      <div
                        style={{ width: "28px", height: "28px", color: "#333" }}
                        dangerouslySetInnerHTML={{
                          __html: BADGE_ICONS[badge.iconKey]?.svg || "",
                        }}
                      />
                      <Text variant="bodySm">{badge.label}</Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Variant
                  </Text>
                  {controlWinning ? null : totalImpressions > 100 ? (
                    <Badge tone="success">Leading</Badge>
                  ) : null}
                </InlineStack>
                <Divider />
                <InlineStack gap="600" align="center">
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold">
                      {test.variantImpressions.toLocaleString()}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Impressions
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold">
                      {test.variantConversions.toLocaleString()}
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Conversions
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" inlineAlign="center">
                    <Text variant="heading2xl" fontWeight="bold" tone={!controlWinning && totalImpressions > 100 ? "success" : undefined}>
                      {variantRate}%
                    </Text>
                    <Text variant="bodySm" tone="subdued">
                      Conv. Rate
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Divider />
                <InlineStack gap="300" align="center" wrap>
                  {variantBadges.slice(0, 6).map((badge, i) => (
                    <BlockStack key={i} gap="100" inlineAlign="center">
                      <div
                        style={{ width: "28px", height: "28px", color: "#333" }}
                        dangerouslySetInnerHTML={{
                          __html: BADGE_ICONS[badge.iconKey]?.svg || "",
                        }}
                      />
                      <Text variant="bodySm">{badge.label}</Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Declare Winner */}
        {test.status === "completed" && !test.winnerId && (
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                Declare a Winner
              </Text>
              <Text variant="bodySm" tone="subdued">
                Choose which configuration to keep as your permanent badge setup.
              </Text>
              <Divider />
              <InlineStack gap="300" align="center">
                <Button
                  variant="primary"
                  onClick={() => handleAction("declare_winner", { winner: "control" })}
                  loading={isSubmitting}
                >
                  Keep Control
                </Button>
                <Button
                  variant="primary"
                  tone="success"
                  onClick={() => handleAction("declare_winner", { winner: "variant" })}
                  loading={isSubmitting}
                >
                  Apply Variant
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {test.winnerId && (
          <Banner
            title={`Winner: ${test.winnerId === "control" ? "Control" : "Variant"}`}
            tone="success"
          >
            The winning configuration has been applied to your store.
          </Banner>
        )}

        {/* Test info */}
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">Test Details</Text>
            <Divider />
            <InlineStack gap="200">
              <Text variant="bodySm" fontWeight="bold">Traffic Split:</Text>
              <Text variant="bodySm">{100 - test.trafficSplit}% Control / {test.trafficSplit}% Variant</Text>
            </InlineStack>
            {test.startedAt && (
              <InlineStack gap="200">
                <Text variant="bodySm" fontWeight="bold">Started:</Text>
                <Text variant="bodySm">{new Date(test.startedAt).toLocaleDateString()}</Text>
              </InlineStack>
            )}
            {test.endedAt && (
              <InlineStack gap="200">
                <Text variant="bodySm" fontWeight="bold">Ended:</Text>
                <Text variant="bodySm">{new Date(test.endedAt).toLocaleDateString()}</Text>
              </InlineStack>
            )}
            <InlineStack gap="200">
              <Text variant="bodySm" fontWeight="bold">Total Impressions:</Text>
              <Text variant="bodySm">{totalImpressions.toLocaleString()}</Text>
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
