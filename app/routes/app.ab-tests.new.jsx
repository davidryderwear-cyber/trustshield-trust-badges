import { useState, useCallback } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  RangeSlider,
  Divider,
  Badge,
  Box,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { BADGE_ICONS, PLAN_LIMITS, BADGE_CATEGORIES } from "../utils/badge-presets";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  if (!config) return redirect("/app/badges");

  const plan = config.plan || "free";
  if (!PLAN_LIMITS[plan].abTesting) return redirect("/app/ab-tests");

  let badges;
  try { badges = JSON.parse(config.badges); } catch { badges = []; }

  return json({
    currentBadges: badges,
    config: {
      layout: config.layout,
      iconSize: config.iconSize,
      iconColor: config.iconColor,
      textColor: config.textColor,
      fontSize: config.fontSize,
      spacing: config.spacing,
      maxWidth: config.maxWidth,
    },
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const name = formData.get("name");
  const trafficSplit = Number(formData.get("trafficSplit")) || 50;
  const variantBadgesJson = formData.get("variantBadges");

  if (!name || name.length < 1) {
    return json({ error: "Test name is required" }, { status: 400 });
  }

  // Validate variant badges JSON
  let parsedVariantBadges;
  try {
    parsedVariantBadges = JSON.parse(variantBadgesJson);
    if (!Array.isArray(parsedVariantBadges) || parsedVariantBadges.length === 0) {
      return json({ error: "Variant must have at least one badge" }, { status: 400 });
    }
  } catch {
    return json({ error: "Invalid variant badges data" }, { status: 400 });
  }

  // Prevent concurrent tests
  const runningTest = await prisma.aBTest.findFirst({
    where: { shop, status: "running" },
  });
  if (runningTest) {
    return json({ error: "You already have a running test. Stop it before creating a new one." }, { status: 400 });
  }

  // Get current config as control snapshot
  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  if (!config) return json({ error: "No badge config found" }, { status: 400 });

  const controlConfig = JSON.stringify({
    badges: config.badges,
    layout: config.layout,
    iconSize: config.iconSize,
    iconColor: config.iconColor,
    textColor: config.textColor,
    fontSize: config.fontSize,
    spacing: config.spacing,
    maxWidth: config.maxWidth,
  });

  const variantConfig = JSON.stringify({
    badges: JSON.stringify(parsedVariantBadges),
    layout: config.layout,
    iconSize: config.iconSize,
    iconColor: config.iconColor,
    textColor: config.textColor,
    fontSize: config.fontSize,
    spacing: config.spacing,
    maxWidth: config.maxWidth,
  });

  const test = await prisma.aBTest.create({
    data: {
      shop,
      name,
      trafficSplit: Math.min(90, Math.max(10, trafficSplit)),
      controlConfig,
      variantConfig,
    },
  });

  return redirect(`/app/ab-tests/${test.id}`);
};

export default function NewABTest() {
  const { currentBadges, config } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [name, setName] = useState("");
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [variantBadges, setVariantBadges] = useState([]);

  const addVariantBadge = useCallback(
    (iconKey) => {
      if (variantBadges.length >= 10) return;
      const icon = BADGE_ICONS[iconKey];
      if (!icon) return;
      setVariantBadges([
        ...variantBadges,
        {
          id: Date.now().toString(),
          iconKey,
          label: icon.name,
          type: "preset",
          enabled: true,
        },
      ]);
    },
    [variantBadges]
  );

  const removeVariantBadge = useCallback(
    (id) => {
      setVariantBadges(variantBadges.filter((b) => b.id !== id));
    },
    [variantBadges]
  );

  const handleCreate = useCallback(() => {
    if (!name) return;
    const formData = new FormData();
    formData.set("name", name);
    formData.set("trafficSplit", trafficSplit.toString());
    formData.set("variantBadges", JSON.stringify(variantBadges));
    submit(formData, { method: "post" });
  }, [name, trafficSplit, variantBadges, submit]);

  return (
    <Page
      title="Create A/B Test"
      backAction={{ content: "A/B Tests", url: "/app/ab-tests" }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Test Name"
              value={name}
              onChange={setName}
              placeholder="e.g., Security badges vs Payment badges"
              autoComplete="off"
            />
            <RangeSlider
              label={`Traffic Split: ${trafficSplit}% Variant / ${100 - trafficSplit}% Control`}
              min={10}
              max={90}
              value={trafficSplit}
              onChange={setTrafficSplit}
              output
            />
          </BlockStack>
        </Card>

        <Layout>
          {/* Control (Current) */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Control (Current)
                  </Text>
                  <Badge>{currentBadges.length} badges</Badge>
                </InlineStack>
                <Divider />
                <InlineStack gap="400" align="center">
                  {currentBadges.map((badge) => (
                    <BlockStack key={badge.id} gap="200" inlineAlign="center">
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          color: config.iconColor,
                        }}
                        dangerouslySetInnerHTML={{
                          __html: BADGE_ICONS[badge.iconKey]?.svg || "",
                        }}
                      />
                      <Text variant="bodySm" alignment="center">
                        {badge.label}
                      </Text>
                    </BlockStack>
                  ))}
                  {currentBadges.length === 0 && (
                    <Text tone="subdued">No badges configured</Text>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Variant */}
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Variant
                  </Text>
                  <Badge tone="attention">{variantBadges.length} badges</Badge>
                </InlineStack>
                <Divider />

                {variantBadges.length > 0 ? (
                  <BlockStack gap="200">
                    {variantBadges.map((badge) => (
                      <InlineStack
                        key={badge.id}
                        align="space-between"
                        blockAlign="center"
                      >
                        <InlineStack gap="200" blockAlign="center">
                          <div
                            style={{
                              width: "24px",
                              height: "24px",
                              color: "#333",
                            }}
                            dangerouslySetInnerHTML={{
                              __html: BADGE_ICONS[badge.iconKey]?.svg || "",
                            }}
                          />
                          <Text variant="bodySm">{badge.label}</Text>
                        </InlineStack>
                        <Button
                          size="slim"
                          tone="critical"
                          onClick={() => removeVariantBadge(badge.id)}
                        >
                          Remove
                        </Button>
                      </InlineStack>
                    ))}
                  </BlockStack>
                ) : (
                  <Text tone="subdued" alignment="center">
                    Add badges below to create your variant
                  </Text>
                )}

                <Divider />
                <Text as="h3" variant="headingSm">
                  Add badges to variant:
                </Text>
                <InlineGrid columns={4} gap="200">
                  {Object.entries(BADGE_ICONS)
                    .slice(0, 20)
                    .map(([key, icon]) => {
                      const added = variantBadges.some(
                        (b) => b.iconKey === key
                      );
                      return (
                        <Box
                          key={key}
                          padding="200"
                          borderRadius="200"
                          background={
                            added
                              ? "bg-surface-disabled"
                              : "bg-surface-secondary"
                          }
                        >
                          <BlockStack gap="100" inlineAlign="center">
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                color: added ? "#aaa" : "#333",
                              }}
                              dangerouslySetInnerHTML={{ __html: icon.svg }}
                            />
                            <Text
                              variant="bodySm"
                              alignment="center"
                              tone={added ? "subdued" : undefined}
                            >
                              {icon.name.length > 12
                                ? icon.name.slice(0, 10) + "..."
                                : icon.name}
                            </Text>
                            <Button
                              size="slim"
                              onClick={() => addVariantBadge(key)}
                              disabled={added}
                            >
                              {added ? "Added" : "Add"}
                            </Button>
                          </BlockStack>
                        </Box>
                      );
                    })}
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <InlineStack align="end">
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={isSubmitting}
            disabled={!name || variantBadges.length === 0}
          >
            Create Test
          </Button>
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
