import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  TextField,
  Select,
  RangeSlider,
  Checkbox,
  Banner,
  Divider,
  Modal,
  Badge,
  Box,
  InlineGrid,
  Tabs,
  Icon,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { BADGE_ICONS, PLAN_LIMITS, BADGE_CATEGORIES, BADGE_TEMPLATES } from "../utils/badge-presets";
import { syncMetafield, clearMetafield } from "../utils/sync-metafield";

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const config = await prisma.badgeConfig.upsert({
    where: { shop },
    update: {},
    create: { shop, badges: "[]" },
  });

  let badges;
  try { badges = JSON.parse(config.badges); } catch { badges = []; }

  const customBadges = await prisma.customBadge.findMany({ where: { shop } });

  return json({
    config: {
      ...config,
      badges,
      status: config.status || "draft",
      badgeName: config.badgeName || "Untitled Badge Set",
      badgeType: config.badgeType || "icon_block",
      startsAt: config.startsAt || null,
      endsAt: config.endsAt || null,
    },
    customBadges,
  });
};

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "save") {
    let data;
    try {
      data = JSON.parse(formData.get("data"));
    } catch {
      return json({ error: "Invalid JSON data" }, { status: 400 });
    }

    if (!Array.isArray(data.badges)) {
      return json({ error: "Invalid badge data" }, { status: 400 });
    }

    const validIconKeys = Object.keys(BADGE_ICONS);
    for (const badge of data.badges) {
      if (badge.type !== "custom" && (!badge.iconKey || !validIconKeys.includes(badge.iconKey))) {
        return json({ error: `Invalid badge icon: ${badge.iconKey}` }, { status: 400 });
      }
      if (typeof badge.label !== "string" || badge.label.length > 100) {
        return json({ error: "Badge labels must be under 100 characters" }, { status: 400 });
      }
    }

    const existingConfig = await prisma.badgeConfig.findUnique({ where: { shop } });
    const plan = existingConfig?.plan || "free";
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    if (data.badges.length > limits.maxBadges) {
      return json({ error: `Badge limit of ${limits.maxBadges} exceeded for ${plan} plan` }, { status: 403 });
    }

    // Sanitize numeric values
    const clamp = (val, min, max, def) => Math.min(max, Math.max(min, Number(val) || def));
    const hexOk = (v) => /^#[0-9a-fA-F]{6}$/.test(v);

    const status = data.status || "draft";

    const saveData = {
      badges: JSON.stringify(data.badges),
      layout: ["horizontal", "vertical", "grid"].includes(data.layout) ? data.layout : "horizontal",
      position: ["below_add_to_cart", "below_price", "below_description", "custom"].includes(data.position) ? data.position : "below_add_to_cart",
      alignment: ["left", "center", "right"].includes(data.alignment) ? data.alignment : "center",
      showOnProduct: Boolean(data.showOnProduct),
      showOnCart: Boolean(data.showOnCart),
      showOnHome: Boolean(data.showOnHome),
      iconSize: clamp(data.iconSize, 16, 80, 32),
      iconColor: hexOk(data.iconColor) ? data.iconColor : "#333333",
      textColor: hexOk(data.textColor) ? data.textColor : "#202223",
      fontSize: clamp(data.fontSize, 10, 28, 16),
      spacing: clamp(data.spacing, 0, 40, 12),
      maxWidth: clamp(data.maxWidth, 200, 1200, 600),
      customCSS: String(data.customCSS || "").slice(0, 2000).replace(/(@import|expression\s*\(|javascript:|behavior\s*:|url\s*\(|\\|<|>)/gi, "/* blocked */"),
      // Design — card
      bgColor: hexOk(data.bgColor) ? data.bgColor : "#ffffff",
      cornerRadius: clamp(data.cornerRadius, 0, 24, 8),
      borderSize: clamp(data.borderSize, 0, 8, 0),
      borderColor: hexOk(data.borderColor) ? data.borderColor : "#c5c8d1",
      // Design — spacing
      paddingTop: clamp(data.paddingTop, 0, 60, 16),
      paddingBottom: clamp(data.paddingBottom, 0, 60, 16),
      marginTop: clamp(data.marginTop, 0, 60, 20),
      marginBottom: clamp(data.marginBottom, 0, 60, 20),
      // Design — icon
      iconBgColor: hexOk(data.iconBgColor) ? data.iconBgColor : "#ffffff",
      iconCornerRadius: clamp(data.iconCornerRadius, 0, 50, 4),
      useOriginalIconColor: Boolean(data.useOriginalIconColor),
      // Design — subtitle
      subtitleFontSize: clamp(data.subtitleFontSize, 8, 22, 14),
      subtitleColor: hexOk(data.subtitleColor) ? data.subtitleColor : "#96a4b6",
      // Placement — targeting
      targetType: ["all", "specific_products", "specific_collections", "specific_tags"].includes(data.targetType) ? data.targetType : "all",
      targetIds: JSON.stringify(Array.isArray(data.targetIds) ? data.targetIds : []),
      // Status & meta
      status,
      badgeName: String(data.badgeName || "Untitled Badge Set").slice(0, 200),
      badgeType: ["single_banner", "icon_block", "minimal_icons", "payment_icons"].includes(data.badgeType) ? data.badgeType : "icon_block",
      startsAt: data.startsAt || null,
      endsAt: data.endsAt || null,
    };

    await prisma.badgeConfig.upsert({
      where: { shop },
      update: saveData,
      create: { shop, ...saveData },
    });

    const updatedConfig = await prisma.badgeConfig.findUnique({ where: { shop } });

    if (status === "published") {
      try {
        await syncMetafield(admin, updatedConfig);
      } catch (error) {
        console.error("Metafield sync failed:", error);
      }
    } else {
      try {
        await clearMetafield(admin);
      } catch (error) {
        console.error("Metafield clear failed:", error);
      }
    }

    return json({ success: true });
  }

  if (intent === "upload_image") {
    const imageUrl = formData.get("imageUrl");
    const imageName = formData.get("imageName");
    if (!imageUrl || !imageName) {
      return json({ error: "Image URL and name required" }, { status: 400 });
    }
    const customBadge = await prisma.customBadge.create({
      data: { shop, name: imageName, imageUrl },
    });
    return json({ success: true, customBadge });
  }

  if (intent === "delete_custom") {
    const badgeId = formData.get("badgeId");
    await prisma.customBadge.deleteMany({ where: { id: badgeId, shop } });
    return json({ success: true });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BadgeConfig() {
  const { config, customBadges } = useLoaderData();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const [searchParams] = useSearchParams();
  const isSaving = navigation.state === "submitting";

  // --- Tab state ---
  const [selectedTab, setSelectedTab] = useState(0);

  // --- Content state ---
  const [badges, setBadges] = useState(config.badges);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [badgeType, setBadgeType] = useState(config.badgeType || searchParams.get("pageType") || "icon_block");
  const [badgeName, setBadgeName] = useState(config.badgeName || "Untitled Badge Set");
  const [badgeStatus, setBadgeStatus] = useState(config.status || "draft");
  const [startsAt, setStartsAt] = useState(config.startsAt || null);
  const [endsAt, setEndsAt] = useState(config.endsAt || null);
  const [startsOption, setStartsOption] = useState(config.startsAt ? "specific" : "now");
  const [endsOption, setEndsOption] = useState(config.endsAt ? "specific" : "never");

  // --- Design state ---
  const [layout, setLayout] = useState(config.layout);
  const [alignment, setAlignment] = useState(config.alignment);
  const [iconSize, setIconSize] = useState(config.iconSize);
  const [iconColor, setIconColor] = useState(config.iconColor);
  const [textColor, setTextColor] = useState(config.textColor);
  const [fontSize, setFontSize] = useState(config.fontSize);
  const [spacing, setSpacing] = useState(config.spacing);
  const [maxWidth, setMaxWidth] = useState(config.maxWidth);
  const [bgColor, setBgColor] = useState(config.bgColor || "#ffffff");
  const [cornerRadius, setCornerRadius] = useState(config.cornerRadius ?? 8);
  const [borderSize, setBorderSize] = useState(config.borderSize ?? 0);
  const [borderColor, setBorderColor] = useState(config.borderColor || "#c5c8d1");
  const [paddingTop, setPaddingTop] = useState(config.paddingTop ?? 16);
  const [paddingBottom, setPaddingBottom] = useState(config.paddingBottom ?? 16);
  const [marginTop, setMarginTop] = useState(config.marginTop ?? 20);
  const [marginBottom, setMarginBottom] = useState(config.marginBottom ?? 20);
  const [iconBgColor, setIconBgColor] = useState(config.iconBgColor || "#ffffff");
  const [iconCornerRadius, setIconCornerRadius] = useState(config.iconCornerRadius ?? 4);
  const [useOriginalIconColor, setUseOriginalIconColor] = useState(config.useOriginalIconColor ?? false);
  const [subtitleFontSize, setSubtitleFontSize] = useState(config.subtitleFontSize ?? 14);
  const [subtitleColor, setSubtitleColor] = useState(config.subtitleColor || "#96a4b6");
  const [customCSS, setCustomCSS] = useState(config.customCSS);

  // --- Placement state ---
  const [showOnProduct, setShowOnProduct] = useState(config.showOnProduct);
  const [showOnCart, setShowOnCart] = useState(config.showOnCart);
  const [showOnHome, setShowOnHome] = useState(config.showOnHome);
  const [position, setPosition] = useState(config.position);
  const [targetType, setTargetType] = useState(config.targetType || "all");

  // --- UI state ---
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (actionData?.success) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData]);

  const plan = config.plan || "free";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  // --- Handlers ---
  const handleSave = useCallback((status) => {
    const resolvedStatus = status || badgeStatus;
    setBadgeStatus(resolvedStatus);
    const data = {
      badges, layout, position, alignment, showOnProduct, showOnCart, showOnHome,
      iconSize, iconColor, textColor, fontSize, spacing, maxWidth, customCSS,
      bgColor, cornerRadius, borderSize, borderColor,
      paddingTop, paddingBottom, marginTop, marginBottom,
      iconBgColor, iconCornerRadius, useOriginalIconColor,
      subtitleFontSize, subtitleColor,
      targetType, targetIds: [],
      status: resolvedStatus,
      badgeName,
      badgeType,
      startsAt: startsOption === "now" ? null : startsAt,
      endsAt: endsOption === "never" ? null : endsAt,
    };
    const formData = new FormData();
    formData.set("intent", "save");
    formData.set("data", JSON.stringify(data));
    submit(formData, { method: "post" });
  }, [
    badges, layout, position, alignment, showOnProduct, showOnCart, showOnHome,
    iconSize, iconColor, textColor, fontSize, spacing, maxWidth, customCSS,
    bgColor, cornerRadius, borderSize, borderColor,
    paddingTop, paddingBottom, marginTop, marginBottom,
    iconBgColor, iconCornerRadius, useOriginalIconColor,
    subtitleFontSize, subtitleColor, targetType, submit,
    badgeStatus, badgeName, badgeType, startsAt, endsAt, startsOption, endsOption,
  ]);

  const addBadge = useCallback((iconKey) => {
    if (badges.length >= limits.maxBadges) return;
    const icon = BADGE_ICONS[iconKey];
    setBadges([...badges, {
      id: Date.now().toString(),
      iconKey,
      label: icon.name,
      subtitle: "",
      type: "preset",
      enabled: true,
    }]);
    setAddModalOpen(false);
  }, [badges, limits.maxBadges]);

  const addCustomBadge = useCallback((customBadge) => {
    if (badges.length >= limits.maxBadges) return;
    setBadges([...badges, {
      id: Date.now().toString(),
      iconKey: `custom_${customBadge.id}`,
      label: customBadge.name,
      subtitle: "",
      type: "custom",
      imageUrl: customBadge.imageUrl,
      enabled: true,
    }]);
    setAddModalOpen(false);
  }, [badges, limits.maxBadges]);

  const handleUploadCustom = useCallback(() => {
    if (!uploadUrl || !uploadName) return;
    const formData = new FormData();
    formData.set("intent", "upload_image");
    formData.set("imageUrl", uploadUrl);
    formData.set("imageName", uploadName);
    submit(formData, { method: "post" });
    setUploadUrl("");
    setUploadName("");
  }, [uploadUrl, uploadName, submit]);

  const removeBadge = useCallback((id) => {
    setBadges(badges.filter((b) => b.id !== id));
  }, [badges]);

  const moveBadge = useCallback((index, direction) => {
    const newBadges = [...badges];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newBadges.length) return;
    [newBadges[index], newBadges[targetIndex]] = [newBadges[targetIndex], newBadges[index]];
    setBadges(newBadges);
  }, [badges]);

  const updateBadge = useCallback((id, field, value) => {
    setBadges(badges.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  }, [badges]);

  const applyTemplate = useCallback((templateKey) => {
    const template = BADGE_TEMPLATES[templateKey];
    if (!template) return;
    const newBadges = template.badges.slice(0, limits.maxBadges).map((iconKey) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      iconKey,
      label: BADGE_ICONS[iconKey]?.name || iconKey,
      subtitle: "",
      type: "preset",
      enabled: true,
    }));
    setBadges(newBadges);
  }, [limits.maxBadges]);

  // --- Color input helper ---
  const ColorField = ({ label, value, onChange, disabled, helpText }) => (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      autoComplete="off"
      disabled={disabled}
      helpText={helpText}
      prefix={
        <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: value, border: "1px solid #ccc" }} />
      }
      connectedRight={
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ width: 34, height: 34, border: "none", padding: 0, cursor: disabled ? "not-allowed" : "pointer", background: "none" }}
        />
      }
    />
  );

  // =========================================================================
  // TAB 1 — Content
  // =========================================================================
  // --- Badge type definitions ---
  const badgeTypeOptions = [
    { value: "single_banner", title: "Single banner", description: "One badge displayed as a full-width banner" },
    { value: "icon_block", title: "Icon block", description: "Row of icons with labels below" },
    { value: "minimal_icons", title: "Minimal icons", description: "Icons only, no text labels" },
    { value: "payment_icons", title: "Payment icons", description: "Payment method icons in a compact grid" },
  ];

  const contentTab = (
    <BlockStack gap="400">
      {/* Badge Name */}
      <Card>
        <BlockStack gap="300">
          <TextField
            label="Badge name"
            value={badgeName}
            onChange={setBadgeName}
            autoComplete="off"
            helpText="Only visible to you. For your own internal reference."
          />
        </BlockStack>
      </Card>

      {/* Badge Type Selector */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Badge Type</Text>
          <InlineStack gap="300" wrap>
            {badgeTypeOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => setBadgeType(opt.value)}
                style={{ cursor: "pointer", flex: "1 1 0", minWidth: 120 }}
              >
                <Box
                  padding="300"
                  borderRadius="200"
                  borderWidth="025"
                  borderColor={badgeType === opt.value ? "border-brand" : "border"}
                  background={badgeType === opt.value ? "bg-surface-selected" : "bg-surface-secondary"}
                >
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">{opt.title}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">{opt.description}</Text>
                  </BlockStack>
                </Box>
              </div>
            ))}
          </InlineStack>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Your Badges ({badges.length}/{limits.maxBadges})
            </Text>
            <InlineStack gap="200">
              <Select
                label="Load template"
                labelHidden
                options={[
                  { label: "Load template...", value: "" },
                  ...Object.entries(BADGE_TEMPLATES).map(([key, t]) => ({
                    label: t.name,
                    value: key,
                  })),
                ]}
                value=""
                onChange={(val) => val && applyTemplate(val)}
              />
              <Button
                variant="primary"
                onClick={() => setAddModalOpen(true)}
                disabled={badges.length >= limits.maxBadges}
              >
                Add Badge
              </Button>
            </InlineStack>
          </InlineStack>

          <Divider />

          {badges.length === 0 ? (
            <Box padding="800" borderRadius="200" background="bg-surface-secondary">
              <BlockStack gap="300" inlineAlign="center">
                <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                  No badges added yet
                </Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  Add badges manually or load a template to get started
                </Text>
                <Button onClick={() => setAddModalOpen(true)}>Add your first badge</Button>
              </BlockStack>
            </Box>
          ) : (
            <BlockStack gap="300">
              {badges.map((badge, index) => (
                <Box
                  key={badge.id}
                  padding="300"
                  borderRadius="200"
                  background="bg-surface-secondary"
                >
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center" gap="300">
                      <InlineStack gap="300" blockAlign="center" wrap={false}>
                        {badge.type === "custom" ? (
                          <img
                            src={badge.imageUrl}
                            alt={badge.label}
                            style={{ width: 40, height: 40, objectFit: "contain" }}
                          />
                        ) : (
                          <div
                            style={{ minWidth: 40, width: 40, height: 40, color: iconColor }}
                            dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }}
                          />
                        )}
                        <BlockStack gap="0">
                          <TextField
                            value={badge.label}
                            onChange={(val) => updateBadge(badge.id, "label", val)}
                            autoComplete="off"
                            labelHidden
                            label="Title"
                            placeholder="Badge title"
                          />
                          <TextField
                            value={badge.subtitle || ""}
                            onChange={(val) => updateBadge(badge.id, "subtitle", val)}
                            autoComplete="off"
                            labelHidden
                            label="Subtitle"
                            placeholder="Optional subtitle"
                          />
                        </BlockStack>
                      </InlineStack>
                      <InlineStack gap="200">
                        <Button size="slim" onClick={() => moveBadge(index, -1)} disabled={index === 0}>
                          ↑
                        </Button>
                        <Button size="slim" onClick={() => moveBadge(index, 1)} disabled={index === badges.length - 1}>
                          ↓
                        </Button>
                        <Button size="slim" tone="critical" onClick={() => removeBadge(badge.id)}>
                          Remove
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </BlockStack>
                </Box>
              ))}
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Scheduling */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Scheduling</Text>
          {!limits.scheduling ? (
            <Banner tone="info">
              Available with Essential plan. <a href="/app/billing">Upgrade now</a>.
            </Banner>
          ) : (
            <BlockStack gap="400">
              {/* Starts */}
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Starts</Text>
                <InlineStack gap="300">
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="startsOption"
                      value="now"
                      checked={startsOption === "now"}
                      onChange={() => { setStartsOption("now"); setStartsAt(null); }}
                    />
                    Right now
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="startsOption"
                      value="specific"
                      checked={startsOption === "specific"}
                      onChange={() => setStartsOption("specific")}
                    />
                    Specific date
                  </label>
                </InlineStack>
                {startsOption === "specific" && (
                  <input
                    type="datetime-local"
                    value={startsAt || ""}
                    onChange={(e) => setStartsAt(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #c5c8d1",
                      fontSize: 14,
                      maxWidth: 280,
                    }}
                  />
                )}
              </BlockStack>

              {/* Ends */}
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Ends</Text>
                <InlineStack gap="300">
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="endsOption"
                      value="never"
                      checked={endsOption === "never"}
                      onChange={() => { setEndsOption("never"); setEndsAt(null); }}
                    />
                    Never
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="endsOption"
                      value="specific"
                      checked={endsOption === "specific"}
                      onChange={() => setEndsOption("specific")}
                    />
                    Specific date
                  </label>
                </InlineStack>
                {endsOption === "specific" && (
                  <input
                    type="datetime-local"
                    value={endsAt || ""}
                    onChange={(e) => setEndsAt(e.target.value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #c5c8d1",
                      fontSize: 14,
                      maxWidth: 280,
                    }}
                  />
                )}
              </BlockStack>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );

  // =========================================================================
  // TAB 2 — Design
  // =========================================================================
  const designTab = (
    <BlockStack gap="400">
      {/* Card Styling */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Card</Text>
          <ColorField
            label="Background color"
            value={bgColor}
            onChange={setBgColor}
          />
          <RangeSlider
            label={`Corner radius: ${cornerRadius}px`}
            min={0} max={24}
            value={cornerRadius}
            onChange={setCornerRadius}
            output
          />
          <InlineGrid columns={2} gap="300">
            <RangeSlider
              label={`Border size: ${borderSize}px`}
              min={0} max={8}
              value={borderSize}
              onChange={setBorderSize}
              output
            />
            <ColorField
              label="Border color"
              value={borderColor}
              onChange={setBorderColor}
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* Layout */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Layout</Text>
          <Select
            label="Badge arrangement"
            options={[
              { label: "Horizontal (row)", value: "horizontal" },
              { label: "Vertical (column)", value: "vertical" },
              { label: "Grid", value: "grid" },
            ]}
            value={layout}
            onChange={setLayout}
          />
          <Select
            label="Alignment"
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
            value={alignment}
            onChange={setAlignment}
          />
          <RangeSlider
            label={`Max width: ${maxWidth}px`}
            min={200} max={1200}
            value={maxWidth}
            onChange={setMaxWidth}
            output
          />
        </BlockStack>
      </Card>

      {/* Spacing */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Spacing</Text>
          <RangeSlider
            label={`Gap between badges: ${spacing}px`}
            min={0} max={40}
            value={spacing}
            onChange={setSpacing}
            output
          />
          <InlineGrid columns={2} gap="300">
            <RangeSlider
              label={`Inside top: ${paddingTop}px`}
              min={0} max={60}
              value={paddingTop}
              onChange={setPaddingTop}
              output
            />
            <RangeSlider
              label={`Inside bottom: ${paddingBottom}px`}
              min={0} max={60}
              value={paddingBottom}
              onChange={setPaddingBottom}
              output
            />
          </InlineGrid>
          <InlineGrid columns={2} gap="300">
            <RangeSlider
              label={`Outside top: ${marginTop}px`}
              min={0} max={60}
              value={marginTop}
              onChange={setMarginTop}
              output
            />
            <RangeSlider
              label={`Outside bottom: ${marginBottom}px`}
              min={0} max={60}
              value={marginBottom}
              onChange={setMarginBottom}
              output
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* Icon */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Icon</Text>
          <RangeSlider
            label={`Icon size: ${iconSize}px`}
            min={16} max={80}
            value={iconSize}
            onChange={setIconSize}
            output
          />
          <Checkbox
            label="Use original icon color"
            checked={useOriginalIconColor}
            onChange={setUseOriginalIconColor}
          />
          {!useOriginalIconColor && (
            <ColorField
              label="Icon color"
              value={iconColor}
              onChange={setIconColor}
              disabled={!limits.customColors}
              helpText={!limits.customColors ? "Upgrade to customize colors" : ""}
            />
          )}
          <ColorField
            label="Icon background"
            value={iconBgColor}
            onChange={setIconBgColor}
          />
          <RangeSlider
            label={`Icon corner radius: ${iconCornerRadius}px`}
            min={0} max={50}
            value={iconCornerRadius}
            onChange={setIconCornerRadius}
            output
          />
        </BlockStack>
      </Card>

      {/* Typography */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Typography</Text>
          <InlineGrid columns={2} gap="300">
            <RangeSlider
              label={`Title size: ${fontSize}px`}
              min={10} max={28}
              value={fontSize}
              onChange={setFontSize}
              output
            />
            <ColorField
              label="Title color"
              value={textColor}
              onChange={setTextColor}
              disabled={!limits.customColors}
              helpText={!limits.customColors ? "Upgrade to customize" : ""}
            />
          </InlineGrid>
          <InlineGrid columns={2} gap="300">
            <RangeSlider
              label={`Subtitle size: ${subtitleFontSize}px`}
              min={8} max={22}
              value={subtitleFontSize}
              onChange={setSubtitleFontSize}
              output
            />
            <ColorField
              label="Subtitle color"
              value={subtitleColor}
              onChange={setSubtitleColor}
              disabled={!limits.customColors}
            />
          </InlineGrid>
        </BlockStack>
      </Card>

      {/* Custom CSS */}
      {limits.customCSS && (
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Custom CSS</Text>
            <TextField
              label="Custom CSS"
              labelHidden
              value={customCSS}
              onChange={setCustomCSS}
              multiline={4}
              autoComplete="off"
              placeholder=".trust-badges-container { }"
            />
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );

  // =========================================================================
  // TAB 3 — Placement
  // =========================================================================
  const placementTab = (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Show badges on</Text>
          <Checkbox
            label="Product pages"
            checked={showOnProduct}
            onChange={setShowOnProduct}
          />
          <Checkbox
            label="Cart page / cart drawer"
            checked={showOnCart}
            onChange={setShowOnCart}
            disabled={!limits.cartPage}
            helpText={!limits.cartPage ? "Available on Essential plan and above" : ""}
          />
          <Checkbox
            label="Home page"
            checked={showOnHome}
            onChange={setShowOnHome}
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Position on product page</Text>
          <Select
            label="Badge position"
            labelHidden
            options={[
              { label: "Below Add to Cart button", value: "below_add_to_cart" },
              { label: "Below price", value: "below_price" },
              { label: "Below description", value: "below_description" },
              { label: "Custom (app block)", value: "custom" },
            ]}
            value={position}
            onChange={setPosition}
          />
          {position === "custom" && (
            <Banner tone="info">
              Using app block positioning. Add the TrustShield block in your theme editor to place badges anywhere.
            </Banner>
          )}
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Select products</Text>
          <Select
            label="Show badges on"
            labelHidden
            options={[
              { label: "All products", value: "all" },
              { label: "Specific products", value: "specific_products" },
              { label: "All products in specific collections", value: "specific_collections" },
              { label: "All products with specific tags", value: "specific_tags", disabled: !limits.tagTargeting },
            ]}
            value={targetType}
            onChange={setTargetType}
          />
          {targetType === "specific_tags" && !limits.tagTargeting && (
            <Banner tone="warning">
              Tag-based targeting is available on Essential plan and above. <a href="/app/billing">Upgrade</a>
            </Banner>
          )}
          {(targetType === "specific_products" || targetType === "specific_collections") && (
            <Banner tone="info">
              Product and collection targeting will use Shopify's resource picker. Save your settings first, then use the theme editor to assign badges.
            </Banner>
          )}
        </BlockStack>
      </Card>

      {/* Geolocation — gated */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">Geolocation targeting</Text>
            <Badge tone="info">Essential</Badge>
          </InlineStack>
          {!limits.geolocation ? (
            <Banner tone="info">
              Show different badges based on visitor location. <a href="/app/billing">Upgrade to Essential</a> to unlock.
            </Banner>
          ) : (
            <Text as="p" tone="subdued">
              Geolocation targeting coming soon.
            </Text>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );

  // =========================================================================
  // Live Preview (shared across all tabs)
  // =========================================================================
  const livePreview = (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">Live Preview</Text>
        <Divider />
        <Box padding="200" borderRadius="200" background="bg-surface-secondary">
          {/* Simulated product page context */}
          <div style={{ padding: "12px 16px", maxWidth: 400, margin: "0 auto" }}>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>Product Name</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>$49.99</div>
            <div style={{
              background: "#000",
              color: "#fff",
              textAlign: "center",
              padding: "10px 0",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              Add to cart
            </div>
            <div style={{
              background: "#5C6AC4",
              color: "#fff",
              textAlign: "center",
              padding: "10px 0",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              marginBottom: `${marginTop}px`,
            }}>
              Buy it now
            </div>

            {/* Badge Block */}
            {badges.length > 0 ? (
              <div
                style={{
                  background: bgColor,
                  borderRadius: `${cornerRadius}px`,
                  border: borderSize > 0 ? `${borderSize}px solid ${borderColor}` : "none",
                  padding: `${paddingTop}px 12px ${paddingBottom}px`,
                  marginBottom: `${marginBottom}px`,
                }}
              >
                {/* single_banner: first badge only, full width, icon + text side by side */}
                {badgeType === "single_banner" && (() => {
                  const badge = badges.filter((b) => b.enabled)[0];
                  if (!badge) return null;
                  const bannerIconSize = Math.max(iconSize, 48);
                  return (
                    <div style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      maxWidth: `${Math.min(maxWidth, 400)}px`,
                      margin: "0 auto",
                    }}>
                      <div style={{
                        width: `${bannerIconSize}px`,
                        height: `${bannerIconSize}px`,
                        backgroundColor: iconBgColor !== "#ffffff" ? iconBgColor : "transparent",
                        borderRadius: `${iconCornerRadius}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {badge.type === "custom" ? (
                          <img src={badge.imageUrl} alt={badge.label} style={{ width: `${bannerIconSize - 4}px`, height: `${bannerIconSize - 4}px`, objectFit: "contain" }} />
                        ) : (
                          <div style={{ width: `${bannerIconSize - 4}px`, height: `${bannerIconSize - 4}px`, color: useOriginalIconColor ? undefined : iconColor }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, lineHeight: 1.2, display: "block", wordBreak: "break-word" }}>{badge.label}</span>
                        {badge.subtitle && (
                          <span style={{ fontSize: `${subtitleFontSize}px`, fontWeight: 400, color: subtitleColor, lineHeight: 1.3, display: "block", wordBreak: "break-word" }}>{badge.subtitle}</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* payment_icons: compact grid, smaller icons, 4+ per row */}
                {badgeType === "payment_icons" && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
                    gap: `${Math.max(spacing, 6)}px`,
                    maxWidth: `${Math.min(maxWidth, 400)}px`,
                    margin: "0 auto",
                    justifyItems: "center",
                  }}>
                    {badges.filter((b) => b.enabled).map((badge) => {
                      const payIconSize = Math.min(iconSize, 32);
                      return (
                        <div key={badge.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <div style={{
                            width: `${payIconSize}px`,
                            height: `${payIconSize}px`,
                            backgroundColor: iconBgColor !== "#ffffff" ? iconBgColor : "transparent",
                            borderRadius: `${iconCornerRadius}px`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {badge.type === "custom" ? (
                              <img src={badge.imageUrl} alt={badge.label} style={{ width: `${payIconSize - 4}px`, height: `${payIconSize - 4}px`, objectFit: "contain" }} />
                            ) : (
                              <div style={{ width: `${payIconSize - 4}px`, height: `${payIconSize - 4}px`, color: useOriginalIconColor ? undefined : iconColor }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
                            )}
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 500, color: textColor, textAlign: "center", lineHeight: 1.1 }}>{badge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* minimal_icons: icons only, no labels */}
                {badgeType === "minimal_icons" && (
                  <div style={{
                    display: "flex",
                    flexDirection: layout === "vertical" ? "column" : "row",
                    flexWrap: "wrap",
                    justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
                    gap: `${spacing}px`,
                    maxWidth: `${Math.min(maxWidth, 400)}px`,
                    margin: "0 auto",
                  }}>
                    {badges.filter((b) => b.enabled).map((badge) => (
                      <div key={badge.id} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{
                          width: `${iconSize}px`,
                          height: `${iconSize}px`,
                          backgroundColor: iconBgColor !== "#ffffff" ? iconBgColor : "transparent",
                          borderRadius: `${iconCornerRadius}px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {badge.type === "custom" ? (
                            <img src={badge.imageUrl} alt={badge.label} style={{ width: `${iconSize - 4}px`, height: `${iconSize - 4}px`, objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: `${iconSize - 4}px`, height: `${iconSize - 4}px`, color: useOriginalIconColor ? undefined : iconColor }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* icon_block: current default behavior */}
                {badgeType === "icon_block" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: layout === "vertical" ? "column" : "row",
                      flexWrap: "wrap",
                      justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
                      gap: `${spacing}px`,
                      maxWidth: `${Math.min(maxWidth, 400)}px`,
                      margin: "0 auto",
                    }}
                  >
                    {badges.filter((b) => b.enabled).map((badge) => (
                      <div
                        key={badge.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          flex: layout === "horizontal" ? "1 1 0" : undefined,
                          minWidth: 0,
                        }}
                      >
                        <div style={{
                          width: `${iconSize}px`,
                          height: `${iconSize}px`,
                          backgroundColor: iconBgColor !== "#ffffff" ? iconBgColor : "transparent",
                          borderRadius: `${iconCornerRadius}px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          {badge.type === "custom" ? (
                            <img src={badge.imageUrl} alt={badge.label} style={{ width: `${iconSize - 4}px`, height: `${iconSize - 4}px`, objectFit: "contain" }} />
                          ) : (
                            <div style={{ width: `${iconSize - 4}px`, height: `${iconSize - 4}px`, color: useOriginalIconColor ? undefined : iconColor }} dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
                          )}
                        </div>
                        <span style={{ fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, textAlign: "center", lineHeight: 1.2, wordBreak: "break-word" }}>{badge.label}</span>
                        {badge.subtitle && (
                          <span style={{ fontSize: `${subtitleFontSize}px`, fontWeight: 400, color: subtitleColor, textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>{badge.subtitle}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "24px 0",
                color: "#999",
                fontSize: 13,
              }}>
                Add badges to see a preview
              </div>
            )}
          </div>
        </Box>
      </BlockStack>
    </Card>
  );

  // =========================================================================
  // Tabs config
  // =========================================================================
  const tabs = [
    { id: "content", content: "Content", accessibilityLabel: "Content" },
    { id: "design", content: "Design", accessibilityLabel: "Design" },
    { id: "placement", content: "Placement", accessibilityLabel: "Placement" },
  ];

  const tabContent = [contentTab, designTab, placementTab];

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <Page
      title={badgeName}
      titleMetadata={
        <Badge tone={badgeStatus === "published" ? "success" : "info"}>
          {badgeStatus === "published" ? "Published" : "Draft"}
        </Badge>
      }
      primaryAction={{
        content: isSaving ? "Publishing..." : "Publish",
        onAction: () => handleSave("published"),
        loading: isSaving,
      }}
      secondaryActions={[
        {
          content: isSaving ? "Saving..." : "Save Draft",
          onAction: () => handleSave("draft"),
          loading: isSaving,
        },
      ]}
      backAction={{ content: "Dashboard", url: "/app" }}
    >
      <BlockStack gap="400">
        {saved && (
          <Banner title="Settings saved and synced to storefront!" tone="success" onDismiss={() => setSaved(false)} />
        )}
        {actionData?.error && (
          <Banner title={actionData.error} tone="critical" />
        )}
        {badges.length >= limits.maxBadges && (
          <Banner tone="warning">
            You've reached the {limits.maxBadges} badge limit on the {plan} plan.{" "}
            <a href="/app/billing">Upgrade for more</a>.
          </Banner>
        )}

        <Layout>
          {/* Left column: Tabbed content */}
          <Layout.Section>
            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  {tabContent[selectedTab]}
                </Box>
              </Tabs>
            </Card>
          </Layout.Section>

          {/* Right column: Live Preview (always visible) */}
          <Layout.Section variant="oneThird">
            <div style={{ position: "sticky", top: 16 }}>
              {livePreview}
            </div>
          </Layout.Section>
        </Layout>

        {/* Add Badge Modal */}
        <Modal
          open={addModalOpen}
          onClose={() => { setAddModalOpen(false); setCategoryFilter("all"); }}
          title="Add a Trust Badge"
          large
        >
          <Modal.Section>
            <BlockStack gap="400">
              {/* Category Filter */}
              <InlineStack gap="200" wrap>
                <Button
                  size="slim"
                  variant={categoryFilter === "all" ? "primary" : undefined}
                  onClick={() => setCategoryFilter("all")}
                >
                  All ({Object.keys(BADGE_ICONS).length})
                </Button>
                {BADGE_CATEGORIES.map((cat) => {
                  const count = Object.values(BADGE_ICONS).filter((i) => i.category === cat.key).length;
                  return (
                    <Button
                      key={cat.key}
                      size="slim"
                      variant={categoryFilter === cat.key ? "primary" : undefined}
                      onClick={() => setCategoryFilter(cat.key)}
                    >
                      {cat.label} ({count})
                    </Button>
                  );
                })}
              </InlineStack>

              <Divider />

              {/* Icon Grid */}
              <InlineGrid columns={4} gap="300">
                {Object.entries(BADGE_ICONS)
                  .filter(([, icon]) => categoryFilter === "all" || icon.category === categoryFilter)
                  .map(([key, icon]) => {
                    const alreadyAdded = badges.some((b) => b.iconKey === key);
                    return (
                      <Box
                        key={key}
                        padding="300"
                        borderRadius="200"
                        background={alreadyAdded ? "bg-surface-disabled" : "bg-surface-secondary"}
                        borderWidth="025"
                        borderColor="border"
                      >
                        <BlockStack gap="200" inlineAlign="center">
                          <div
                            style={{ width: 36, height: 36, color: alreadyAdded ? "#aaa" : "#333" }}
                            dangerouslySetInnerHTML={{ __html: icon.svg }}
                          />
                          <Text as="p" variant="bodySm" alignment="center" tone={alreadyAdded ? "subdued" : undefined}>
                            {icon.name}
                          </Text>
                          <Badge tone="info">{icon.category}</Badge>
                          <Button size="slim" onClick={() => addBadge(key)} disabled={alreadyAdded}>
                            {alreadyAdded ? "Added" : "Add"}
                          </Button>
                        </BlockStack>
                      </Box>
                    );
                  })}
              </InlineGrid>

              {/* Custom Upload */}
              {limits.customUpload ? (
                <>
                  <Divider />
                  <Text as="h3" variant="headingMd">Custom Badge Image</Text>
                  <InlineStack gap="300" blockAlign="end">
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Badge Name"
                        value={uploadName}
                        onChange={setUploadName}
                        autoComplete="off"
                        placeholder="e.g. BBB Accredited"
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <TextField
                        label="Image URL"
                        value={uploadUrl}
                        onChange={setUploadUrl}
                        autoComplete="off"
                        placeholder="https://example.com/badge.png"
                        helpText="PNG or SVG recommended. Use Shopify Files to host."
                      />
                    </div>
                    <Button variant="primary" onClick={handleUploadCustom} disabled={!uploadUrl || !uploadName}>
                      Upload
                    </Button>
                  </InlineStack>

                  {customBadges && customBadges.length > 0 && (
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" tone="subdued">Your custom badges:</Text>
                      <InlineStack gap="300">
                        {customBadges.map((cb) => (
                          <Box key={cb.id} padding="200" borderRadius="200" background="bg-surface-secondary" borderWidth="025" borderColor="border">
                            <BlockStack gap="100" inlineAlign="center">
                              <img src={cb.imageUrl} alt={cb.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
                              <Text as="p" variant="bodySm">{cb.name}</Text>
                              <Button size="slim" onClick={() => addCustomBadge(cb)}>Add</Button>
                            </BlockStack>
                          </Box>
                        ))}
                      </InlineStack>
                    </BlockStack>
                  )}
                </>
              ) : (
                <>
                  <Divider />
                  <Banner tone="info">
                    <p>Custom badge images available on Starter plan and above. <a href="/app/billing">Upgrade</a></p>
                  </Banner>
                </>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}
