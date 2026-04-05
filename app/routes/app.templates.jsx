import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Divider,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { BADGE_ICONS, BADGE_TEMPLATES, PLAN_LIMITS } from "../utils/badge-presets";

export const links = () => []; // Polaris styles loaded by parent app route

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const config = await prisma.badgeConfig.findUnique({ where: { shop } });
  let badgeCount = 0;
  try { badgeCount = config ? JSON.parse(config.badges).length : 0; } catch { badgeCount = 0; }
  return json({
    currentBadgeCount: badgeCount,
    plan: config?.plan || "free",
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const templateKey = formData.get("template");
  const template = BADGE_TEMPLATES[templateKey];

  if (!template) return json({ error: "Template not found" }, { status: 400 });

  // Check plan limits
  const existingConfig = await prisma.badgeConfig.findUnique({ where: { shop } });
  const plan = existingConfig?.plan || "free";
  const limits = PLAN_LIMITS[plan];
  if (template.badges.length > limits.maxBadges) {
    return json({ error: `Template has ${template.badges.length} badges but your ${plan} plan allows ${limits.maxBadges}` }, { status: 403 });
  }

  const badges = template.badges.map((iconKey, i) => ({
    id: `${Date.now()}-${i}`,
    iconKey,
    label: BADGE_ICONS[iconKey].name,
    enabled: true,
  }));

  await prisma.badgeConfig.upsert({
    where: { shop },
    update: { badges: JSON.stringify(badges) },
    create: { shop, badges: JSON.stringify(badges) },
  });

  return json({ success: true, applied: template.name });
};

export default function Templates() {
  const { currentBadgeCount, plan } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [applied, setApplied] = useState(null);
  const [submittingKey, setSubmittingKey] = useState(null);

  const applyTemplate = useCallback((key) => {
    setSubmittingKey(key);
    const formData = new FormData();
    formData.set("template", key);
    submit(formData, { method: "post" });
    setApplied(BADGE_TEMPLATES[key].name);
  }, [submit]);

  return (
    <Page
      title="Badge Templates"
      subtitle="One-click badge sets to get you started fast"
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <BlockStack gap="500">
        {applied && (
          <Banner
            title={`"${applied}" template applied!`}
            tone="success"
            action={{ content: "Configure Badges", url: "/app/badges" }}
            onDismiss={() => setApplied(null)}
          >
            Go to Configure Badges to customize labels, colors, and layout.
          </Banner>
        )}

        {currentBadgeCount > 0 && (
          <Banner tone="warning">
            Applying a template will replace your current {currentBadgeCount} badge(s).
          </Banner>
        )}

        <Layout>
          {Object.entries(BADGE_TEMPLATES).map(([key, template]) => (
            <Layout.Section key={key} variant="oneHalf">
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingMd">{template.name}</Text>
                    <Badge>{template.badges.length} badges</Badge>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {template.description}
                  </Text>
                  <Divider />
                  <InlineStack gap="500" align="center">
                    {template.badges.map((iconKey) => (
                      <BlockStack key={iconKey} gap="200" inlineAlign="center">
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            color: "#333",
                          }}
                          dangerouslySetInnerHTML={{
                            __html: BADGE_ICONS[iconKey]?.svg || "",
                          }}
                        />
                        <Text as="p" variant="bodySm" alignment="center">
                          {BADGE_ICONS[iconKey]?.name}
                        </Text>
                      </BlockStack>
                    ))}
                  </InlineStack>
                  <Button
                    variant="primary"
                    onClick={() => applyTemplate(key)}
                    loading={navigation.state === "submitting" && submittingKey === key}
                    fullWidth
                  >
                    Apply Template
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          ))}
        </Layout>
      </BlockStack>
    </Page>
  );
}
