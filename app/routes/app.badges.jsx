import { useState, useCallback, useEffect } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation, useActionData, useSearchParams } from "@remix-run/react";
import {
  Page,
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
      configId: config.id,
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
      bgGradient: Boolean(data.bgGradient),
      bgColorEnd: hexOk(data.bgColorEnd) ? data.bgColorEnd : "#f4f6f8",
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
      badgeType: ["single_banner", "icon_block", "minimal_icons", "compact_grid"].includes(data.badgeType) ? data.badgeType : "icon_block",
      startsAt: data.startsAt || null,
      endsAt: data.endsAt || null,
      // New fields
      titleAboveIcons: String(data.titleAboveIcons || "").slice(0, 200),
      titleGap: clamp(data.titleGap, 0, 40, 12),
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
  const [titleAboveIcons, setTitleAboveIcons] = useState(config.titleAboveIcons || "");

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
  const [bgGradient, setBgGradient] = useState(config.bgGradient ?? false);
  const [bgColorEnd, setBgColorEnd] = useState(config.bgColorEnd || "#f4f6f8");
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
  const [titleGap, setTitleGap] = useState(config.titleGap ?? 12);

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
    const clamp = (val, min, max, def) => Math.min(max, Math.max(min, Number(val) || def));
    const data = {
      badges, layout, position, alignment, showOnProduct, showOnCart, showOnHome,
      iconSize, iconColor, textColor, fontSize, spacing, maxWidth, customCSS,
      bgColor, bgGradient, bgColorEnd, cornerRadius, borderSize, borderColor,
      paddingTop, paddingBottom, marginTop, marginBottom,
      iconBgColor, iconCornerRadius, useOriginalIconColor,
      subtitleFontSize, subtitleColor,
      targetType, targetIds: [],
      status: resolvedStatus,
      badgeName,
      badgeType,
      startsAt: startsOption === "now" ? null : startsAt,
      endsAt: endsOption === "never" ? null : endsAt,
      titleAboveIcons,
      titleGap: clamp(titleGap, 0, 40, 12),
    };
    const formData = new FormData();
    formData.set("intent", "save");
    formData.set("data", JSON.stringify(data));
    submit(formData, { method: "post" });
  }, [
    badges, layout, position, alignment, showOnProduct, showOnCart, showOnHome,
    iconSize, iconColor, textColor, fontSize, spacing, maxWidth, customCSS,
    bgColor, bgGradient, bgColorEnd, cornerRadius, borderSize, borderColor,
    paddingTop, paddingBottom, marginTop, marginBottom,
    iconBgColor, iconCornerRadius, useOriginalIconColor,
    subtitleFontSize, subtitleColor, targetType, submit,
    badgeStatus, badgeName, badgeType, startsAt, endsAt, startsOption, endsOption,
    titleAboveIcons, titleGap,
  ]);

  const addBadge = useCallback((iconKey) => {
    if (badges.length >= limits.maxBadges) return;
    const icon = BADGE_ICONS[iconKey];
    setBadges((prev) => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      iconKey,
      label: icon.name,
      subtitle: "",
      type: "preset",
      enabled: true,
    }]);
    // Keep modal open so user can add multiple badges
  }, [limits.maxBadges]);

  const addCustomBadge = useCallback((customBadge) => {
    if (badges.length >= limits.maxBadges) return;
    setBadges((prev) => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
      iconKey: `custom_${customBadge.id}`,
      label: customBadge.name,
      subtitle: "",
      type: "custom",
      imageUrl: customBadge.imageUrl,
      enabled: true,
    }]);
    // Keep modal open so user can add multiple badges
  }, [limits.maxBadges]);

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

  // --- PxInput: clean number + px label (like Essential) ---
  const PxInput = ({ label, value, onChange, min = 0, max = 100 }) => (
    <BlockStack gap="100">
      <Text as="p" variant="bodySm" tone="subdued">{label}</Text>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
          style={{
            width: 64,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #c5c8d1",
            fontSize: 14,
            textAlign: "right",
            background: "#fff",
          }}
        />
        <Text as="span" variant="bodySm" tone="subdued">px</Text>
      </div>
    </BlockStack>
  );

  // --- Design Templates (full preset applied at once) ---
  const DESIGN_TEMPLATES = [
    { label: "Minimal", value: "minimal",   bg: "#ffffff", iconBg: "#f4f6f8", icon: "#333333", text: "#202223", border: "#e1e3e5", cornerRadius: 8,  borderSize: 0, fontSize: 14, iconSize: 32, iconCornerRadius: 4  },
    { label: "Classic", value: "classic",   bg: "#f9fafb", iconBg: "#e3e5e7", icon: "#444444", text: "#202223", border: "#c5c8d1", cornerRadius: 8,  borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 6  },
    { label: "Ocean",   value: "ocean",     bg: "#f0f7ff", iconBg: "#dbeafe", icon: "#1d4ed8", text: "#1e3a5f", border: "#bfdbfe", cornerRadius: 10, borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
    { label: "Forest",  value: "forest",    bg: "#f0fdf4", iconBg: "#d1fae5", icon: "#059669", text: "#065f46", border: "#6ee7b7", cornerRadius: 10, borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
    { label: "Amber",   value: "amber",     bg: "#fffbeb", iconBg: "#fef3c7", icon: "#d97706", text: "#78350f", border: "#fde68a", cornerRadius: 8,  borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
    { label: "Purple",  value: "purple",    bg: "#faf5ff", iconBg: "#ede9fe", icon: "#7c3aed", text: "#3b0764", border: "#ddd6fe", cornerRadius: 10, borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
    { label: "Rose",    value: "rose",      bg: "#fff1f2", iconBg: "#ffe4e6", icon: "#e11d48", text: "#881337", border: "#fecdd3", cornerRadius: 8,  borderSize: 1, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
    { label: "Dark",    value: "dark",      bg: "#1f2937", iconBg: "#374151", icon: "#ffffff", text: "#f9fafb", border: "#4b5563", cornerRadius: 12, borderSize: 0, fontSize: 14, iconSize: 32, iconCornerRadius: 8  },
  ];

  const applyDesignTemplate = useCallback((templateValue) => {
    const t = DESIGN_TEMPLATES.find((d) => d.value === templateValue);
    if (!t) return;
    setBgColor(t.bg);
    setIconBgColor(t.iconBg);
    setIconColor(t.icon);
    setTextColor(t.text);
    setBorderColor(t.border);
    setCornerRadius(t.cornerRadius);
    setBorderSize(t.borderSize);
    setFontSize(t.fontSize);
    setIconSize(t.iconSize);
    setIconCornerRadius(t.iconCornerRadius);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Color theme presets ---
  const COLOR_THEMES = [
    { name: "Clean White",   bg: "#ffffff", iconBg: "#f4f6f8", icon: "#333333", text: "#202223", border: "#e1e3e5" },
    { name: "Soft Grey",     bg: "#f9fafb", iconBg: "#e3e5e7", icon: "#444444", text: "#202223", border: "#c5c8d1" },
    { name: "Ocean Blue",    bg: "#f0f7ff", iconBg: "#dbeafe", icon: "#1d4ed8", text: "#1e3a5f", border: "#bfdbfe" },
    { name: "Forest Green",  bg: "#f0fdf4", iconBg: "#d1fae5", icon: "#059669", text: "#065f46", border: "#6ee7b7" },
    { name: "Warm Amber",    bg: "#fffbeb", iconBg: "#fef3c7", icon: "#d97706", text: "#78350f", border: "#fde68a" },
    { name: "Purple",        bg: "#faf5ff", iconBg: "#ede9fe", icon: "#7c3aed", text: "#3b0764", border: "#ddd6fe" },
    { name: "Rose",          bg: "#fff1f2", iconBg: "#ffe4e6", icon: "#e11d48", text: "#881337", border: "#fecdd3" },
    { name: "Dark",          bg: "#1f2937", iconBg: "#374151", icon: "#ffffff", text: "#f9fafb", border: "#4b5563" },
  ];

  const ICON_SHAPES = [
    { label: "None",    radius: 0  },
    { label: "Rounded", radius: 8  },
    { label: "Pill",    radius: 50 },
    { label: "Circle",  radius: 999 },
  ];

  const applyColorTheme = useCallback((theme) => {
    setBgColor(theme.bg);
    setIconBgColor(theme.iconBg);
    setIconColor(theme.icon);
    setTextColor(theme.text);
    setBorderColor(theme.border);
  }, []);

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
  // TAB 1 — Content (ONE Card)
  // =========================================================================
  const contentTab = (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          {/* Badge type — plain radio buttons */}
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">Badge type</Text>
            {[
              { value: "single_banner", label: "Single banner" },
              { value: "icon_block", label: "Icon block" },
              { value: "minimal_icons", label: "Minimal icons" },
              { value: "compact_grid", label: "Payment icons" },
            ].map((opt) => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input type="radio" name="badgeType" value={opt.value} checked={badgeType === opt.value}
                  onChange={() => setBadgeType(opt.value)} />
                {opt.label}
              </label>
            ))}
          </BlockStack>

          <Divider />

          {/* Badge name */}
          <TextField
            label="Badge name"
            value={badgeName}
            onChange={setBadgeName}
            autoComplete="off"
            helpText="Only visible to you. For your own internal reference."
          />

          <Divider />

          {/* --- Type-specific content --- */}

          {/* SINGLE BANNER */}
          {badgeType === "single_banner" && (
            <BlockStack gap="300">
              <TextField
                label="Title"
                value={badges[0]?.label || ""}
                onChange={(val) => {
                  if (badges.length === 0) return;
                  updateBadge(badges[0].id, "label", val);
                }}
                autoComplete="off"
              />
              <TextField
                label="Subheading"
                value={badges[0]?.subtitle || ""}
                onChange={(val) => {
                  if (badges.length === 0) return;
                  updateBadge(badges[0].id, "subtitle", val);
                }}
                autoComplete="off"
              />
              {/* Icon section */}
              {badges.length > 0 && (
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Icon</Text>
                  <InlineStack gap="300" blockAlign="center">
                    {badges[0].type === "custom" ? (
                      <img src={badges[0].imageUrl} alt={badges[0].label} style={{ width: 40, height: 40, objectFit: "contain" }} />
                    ) : (
                      <div style={{ minWidth: 40, width: 40, height: 40, color: iconColor }}
                        dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badges[0].iconKey]?.svg || "" }} />
                    )}
                    <Button size="slim" tone="critical" onClick={() => removeBadge(badges[0].id)}>Remove icon</Button>
                    <Button size="slim" onClick={() => setAddModalOpen(true)}>Upload Icon</Button>
                  </InlineStack>
                </BlockStack>
              )}
              {badges.length === 0 && (
                <Button onClick={() => setAddModalOpen(true)}>Add Badge</Button>
              )}
              <Select
                label="Call to action"
                options={[
                  { label: "No call to action", value: "none" },
                  { label: "Link URL", value: "link" },
                ]}
                value="none"
                onChange={() => {}}
              />
            </BlockStack>
          )}

          {/* ICON BLOCK */}
          {badgeType === "icon_block" && (
            <BlockStack gap="400">
              <TextField
                label="Title above icons"
                value={titleAboveIcons}
                onChange={setTitleAboveIcons}
                autoComplete="off"
              />
              {badges.map((badge, index) => (
                <BlockStack key={badge.id} gap="300">
                  <Text as="p" variant="bodyMd" fontWeight="bold">Icon #{index + 1}</Text>
                  <TextField
                    label="Title"
                    value={badge.label}
                    onChange={(val) => updateBadge(badge.id, "label", val)}
                    autoComplete="off"
                  />
                  <TextField
                    label="Subheading"
                    value={badge.subtitle || ""}
                    onChange={(val) => updateBadge(badge.id, "subtitle", val)}
                    autoComplete="off"
                  />
                  {/* Icon */}
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">Icon</Text>
                    <InlineStack gap="300" blockAlign="center">
                      {badge.type === "custom" ? (
                        <img src={badge.imageUrl} alt={badge.label} style={{ width: 40, height: 40, objectFit: "contain" }} />
                      ) : (
                        <div style={{ minWidth: 40, width: 40, height: 40, color: iconColor }}
                          dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
                      )}
                      <Button size="slim" onClick={() => removeBadge(badge.id)}>Remove icon</Button>
                      <Button size="slim" onClick={() => setAddModalOpen(true)}>Upload Icon</Button>
                    </InlineStack>
                    {!limits.customUpload && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Available with Starter plan.{" "}
                        <a href="/app/billing" style={{ color: "#005bd3" }}>Upgrade now</a>.
                      </Text>
                    )}
                  </BlockStack>
                  {/* Call to action */}
                  <Select
                    label="Call to action"
                    options={[
                      { label: "No call to action", value: "none" },
                      { label: "Link URL", value: "link" },
                    ]}
                    value={badge.callToAction || "none"}
                    onChange={(val) => updateBadge(badge.id, "callToAction", val)}
                  />
                  {/* Reorder + Remove row */}
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="100">
                      <Button size="slim" onClick={() => moveBadge(index, -1)} disabled={index === 0}>∧</Button>
                      <Button size="slim" onClick={() => moveBadge(index, 1)} disabled={index === badges.length - 1}>∨</Button>
                    </InlineStack>
                    <button
                      onClick={() => removeBadge(badge.id)}
                      style={{ background: "none", border: "none", color: "#d72c0d", cursor: "pointer", fontSize: 14, padding: 0 }}
                    >
                      Remove icon
                    </button>
                  </InlineStack>
                  {index < badges.length - 1 && <Divider />}
                </BlockStack>
              ))}
              <Button onClick={() => setAddModalOpen(true)} disabled={badges.length >= limits.maxBadges}>
                Add new icon
              </Button>
            </BlockStack>
          )}

          {/* MINIMAL ICONS or COMPACT GRID (Payment icons) */}
          {(badgeType === "minimal_icons" || badgeType === "compact_grid") && (
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Your Badges ({badges.length}/{limits.maxBadges})
                </Text>
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
              </InlineStack>

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
                    <Box key={badge.id} padding="300" borderRadius="200" background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center" gap="300">
                          <InlineStack gap="300" blockAlign="center" wrap={false}>
                            {badge.type === "custom" ? (
                              <img src={badge.imageUrl} alt={badge.label} style={{ width: 40, height: 40, objectFit: "contain" }} />
                            ) : (
                              <div style={{ minWidth: 40, width: 40, height: 40, color: iconColor }}
                                dangerouslySetInnerHTML={{ __html: BADGE_ICONS[badge.iconKey]?.svg || "" }} />
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

              <Button variant="primary" onClick={() => setAddModalOpen(true)} disabled={badges.length >= limits.maxBadges}>
                Add Badge
              </Button>
            </BlockStack>
          )}

          <Divider />

          {/* Translations */}
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">Translations</Text>
            <Button disabled={!limits.scheduling} onClick={() => {}}>Add translation</Button>
            {!limits.scheduling && (
              <Text as="p" variant="bodySm" tone="subdued">
                Available with Essential plan.{" "}
                <a href="/app/billing" style={{ color: "#005bd3" }}>Upgrade now</a>.
              </Text>
            )}
          </BlockStack>

          <Divider />

          {/* Scheduling */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Scheduling</Text>
            {!limits.scheduling && (
              <Text as="p" variant="bodySm" tone="subdued">
                Available with Essential plan.{" "}
                <a href="/app/billing" style={{ color: "#005bd3" }}>Upgrade now</a>.
              </Text>
            )}
            <BlockStack gap="400">
              {/* Starts */}
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Starts</Text>
                <BlockStack gap="100">
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name="startsOption" value="now" checked={startsOption === "now"}
                      onChange={() => { setStartsOption("now"); setStartsAt(null); }} />
                    Right now
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: !limits.scheduling ? "not-allowed" : "pointer", opacity: !limits.scheduling ? 0.5 : 1 }}>
                    <input type="radio" name="startsOption" value="specific" checked={startsOption === "specific"}
                      onChange={() => limits.scheduling && setStartsOption("specific")}
                      disabled={!limits.scheduling} />
                    Specific date
                  </label>
                </BlockStack>
                {startsOption === "specific" && limits.scheduling && (
                  <input type="datetime-local" value={startsAt || ""} onChange={(e) => setStartsAt(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #c5c8d1", fontSize: 14, maxWidth: 280 }} />
                )}
              </BlockStack>

              {/* Ends */}
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">Ends</Text>
                <BlockStack gap="100">
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="radio" name="endsOption" value="never" checked={endsOption === "never"}
                      onChange={() => { setEndsOption("never"); setEndsAt(null); }} />
                    Never
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: !limits.scheduling ? "not-allowed" : "pointer", opacity: !limits.scheduling ? 0.5 : 1 }}>
                    <input type="radio" name="endsOption" value="specific" checked={endsOption === "specific"}
                      onChange={() => limits.scheduling && setEndsOption("specific")}
                      disabled={!limits.scheduling} />
                    Specific date
                  </label>
                </BlockStack>
                {endsOption === "specific" && limits.scheduling && (
                  <input type="datetime-local" value={endsAt || ""} onChange={(e) => setEndsAt(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #c5c8d1", fontSize: 14, maxWidth: 280 }} />
                )}
              </BlockStack>
            </BlockStack>
          </BlockStack>

          <Divider />

          {/* Continue to design */}
          <Button variant="primary" fullWidth onClick={() => setSelectedTab(1)}>
            Continue to design
          </Button>

        </BlockStack>
      </Card>
    </BlockStack>
  );

  // =========================================================================
  // TAB 2 — Design (ONE Card with Dividers between sections)
  // =========================================================================
  const designTab = (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">

          {/* 1. Template — dropdown only */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Template</Text>
            <Select
              label="Apply a template"
              labelHidden
              options={[
                { label: "Choose a template...", value: "" },
                ...DESIGN_TEMPLATES.map((t) => ({ label: t.label, value: t.value })),
              ]}
              value=""
              onChange={(val) => val && applyDesignTemplate(val)}
            />
          </BlockStack>

          <Divider />

          {/* 2. Card */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Card</Text>
            <BlockStack gap="200">
              <InlineStack gap="300">
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" name="bgType" value="solid" checked={!bgGradient} onChange={() => setBgGradient(false)} />
                  Single color background
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 14 }}>
                  <input type="radio" name="bgType" value="gradient" checked={bgGradient} onChange={() => setBgGradient(true)} />
                  Gradient background
                </label>
              </InlineStack>
              {!bgGradient ? (
                <ColorField label="Background color" value={bgColor} onChange={setBgColor} />
              ) : (
                <InlineGrid columns={2} gap="300">
                  <ColorField label="Gradient start" value={bgColor} onChange={setBgColor} />
                  <ColorField label="Gradient end" value={bgColorEnd} onChange={setBgColorEnd} />
                </InlineGrid>
              )}
            </BlockStack>
            <PxInput label="Corner radius" value={cornerRadius} onChange={setCornerRadius} min={0} max={24} />
            <InlineGrid columns={2} gap="300">
              <PxInput label="Border size" value={borderSize} onChange={setBorderSize} min={0} max={8} />
              <ColorField label="Border color" value={borderColor} onChange={setBorderColor} />
            </InlineGrid>

            {/* Spacing sub-header */}
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">Spacing</Text>
              <InlineGrid columns={2} gap="300">
                <PxInput label="Inside top" value={paddingTop} onChange={setPaddingTop} min={0} max={60} />
                <PxInput label="Inside bottom" value={paddingBottom} onChange={setPaddingBottom} min={0} max={60} />
              </InlineGrid>
              <InlineGrid columns={2} gap="300">
                <PxInput label="Outside top" value={marginTop} onChange={setMarginTop} min={0} max={60} />
                <PxInput label="Outside bottom" value={marginBottom} onChange={setMarginBottom} min={0} max={60} />
              </InlineGrid>
            </BlockStack>

            <PxInput label="Title gap" value={titleGap} onChange={setTitleGap} min={0} max={40} />
          </BlockStack>

          <Divider />

          {/* 4. Icon */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Icon</Text>
            <PxInput label="Icon size" value={iconSize} onChange={setIconSize} min={16} max={80} />
            <Checkbox label="Use original icon color" checked={useOriginalIconColor} onChange={setUseOriginalIconColor} />
            {!useOriginalIconColor && (
              <ColorField label="Icon color" value={iconColor} onChange={setIconColor}
                disabled={!limits.customColors} helpText={!limits.customColors ? "Upgrade to customize" : ""} />
            )}
            <ColorField label="Icon background color" value={iconBgColor} onChange={setIconBgColor} />
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">Background shape</Text>
              <InlineStack gap="200" wrap>
                {ICON_SHAPES.map((shape) => {
                  const r = shape.radius === 999 ? "50%" : `${shape.radius}px`;
                  const active = iconCornerRadius === shape.radius;
                  return (
                    <button key={shape.label} onClick={() => setIconCornerRadius(shape.radius)} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      padding: "8px 12px", borderRadius: 8, cursor: "pointer", minWidth: 60,
                      border: `2px solid ${active ? "#303030" : "#e1e3e5"}`,
                      background: active ? "#f0f0f0" : "#fff",
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: r, background: iconBgColor, border: `1.5px solid ${borderColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 14, height: 14, borderRadius: 2, background: iconColor, opacity: 0.8 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? "#303030" : "#6d7175" }}>{shape.label}</span>
                    </button>
                  );
                })}
              </InlineStack>
            </BlockStack>
          </BlockStack>

          <Divider />

          {/* 6. Typography */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Typography</Text>
            <InlineGrid columns={2} gap="300">
              <PxInput label="Title size" value={fontSize} onChange={setFontSize} min={10} max={28} />
              <ColorField label="Title color" value={textColor} onChange={setTextColor}
                disabled={!limits.customColors} helpText={!limits.customColors ? "Upgrade to customize" : ""} />
            </InlineGrid>
            <InlineGrid columns={2} gap="300">
              <PxInput label="Subtitle size" value={subtitleFontSize} onChange={setSubtitleFontSize} min={8} max={22} />
              <ColorField label="Subtitle color" value={subtitleColor} onChange={setSubtitleColor} disabled={!limits.customColors} />
            </InlineGrid>
          </BlockStack>

          <Divider />

          {/* 8. Layout */}
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Layout</Text>
            <Select label="Badge arrangement"
              options={[{ label: "Horizontal (row)", value: "horizontal" }, { label: "Vertical (column)", value: "vertical" }, { label: "Grid", value: "grid" }]}
              value={layout} onChange={setLayout} />
            <Select label="Alignment"
              options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]}
              value={alignment} onChange={setAlignment} />
            <PxInput label="Max width" value={maxWidth} onChange={setMaxWidth} min={200} max={1200} />
          </BlockStack>

          {/* Custom CSS — gated, at bottom */}
          {limits.customCSS && (
            <>
              <Divider />
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Custom CSS</Text>
                <TextField label="Custom CSS" labelHidden value={customCSS} onChange={setCustomCSS}
                  multiline={4} autoComplete="off" placeholder=".trust-badges-container { }" />
              </BlockStack>
            </>
          )}

          <Divider />

          {/* Continue to placement */}
          <Button variant="primary" fullWidth onClick={() => setSelectedTab(2)}>
            Continue to placement
          </Button>

        </BlockStack>
      </Card>
    </BlockStack>
  );

  // =========================================================================
  // TAB 3 — Placement (2 Cards)
  // =========================================================================
  const placementTab = (
    <BlockStack gap="400">
      {/* Card 1: Select products */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Select products</Text>
          {[
            { value: "all", label: "All products", disabled: false, description: null },
            { value: "specific_products", label: "Specific products", disabled: false, description: null },
            { value: "specific_collections", label: "All products in specific collections", disabled: false, description: null },
            { value: "specific_tags", label: "All products with specific tags", disabled: !limits.tagTargeting, description: !limits.tagTargeting ? "Available with Essential plan. Upgrade now." : null },
            { value: "custom", label: "Custom position", disabled: false, description: "Add banner or icon block anywhere using app blocks." },
          ].map((opt) => (
            <BlockStack key={opt.value} gap="0">
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: opt.disabled ? "not-allowed" : "pointer", fontSize: 14, opacity: opt.disabled ? 0.5 : 1 }}>
                <input type="radio" name="targetType" value={opt.value} checked={targetType === opt.value}
                  disabled={opt.disabled}
                  onChange={() => {
                    if (opt.value === "custom") {
                      setTargetType(opt.value);
                      setPosition("custom");
                    } else {
                      setTargetType(opt.value);
                    }
                  }} />
                {opt.label}
              </label>
              {opt.description && (
                <Text as="p" variant="bodySm" tone="subdued" breakWord>
                  <span style={{ paddingLeft: 24, display: "block" }}>{opt.description}</span>
                </Text>
              )}
              {opt.value === "custom" && targetType === "custom" && (
                <div style={{ paddingLeft: 24, paddingTop: 12 }}>
                  <BlockStack gap="300">
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Badge ID</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="text"
                          readOnly
                          value={config.configId || ""}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #c5c8d1",
                            fontSize: 13,
                            fontFamily: "monospace",
                            background: "#f6f6f7",
                            color: "#303030",
                          }}
                        />
                        <Button
                          size="slim"
                          onClick={() => {
                            navigator.clipboard.writeText(config.configId || "");
                            shopify.toast.show("Badge ID copied!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You can use this badge id in theme editor.
                      </Text>
                    </BlockStack>
                    <BlockStack gap="100">
                      <Text as="p" variant="bodyMd" fontWeight="semibold">Code snippet</Text>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="text"
                          readOnly
                          value={`<div class="trustshield-block" id="${config.configId || ""}"></div>`}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #c5c8d1",
                            fontSize: 13,
                            fontFamily: "monospace",
                            background: "#f6f6f7",
                            color: "#303030",
                          }}
                        />
                        <Button
                          size="slim"
                          onClick={() => {
                            navigator.clipboard.writeText(`<div class="trustshield-block" id="${config.configId || ""}"></div>`);
                            shopify.toast.show("Code snippet copied!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You can use this code snippet anywhere in your theme.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              )}
            </BlockStack>
          ))}
        </BlockStack>
      </Card>

      {/* Card 2: Geolocation targeting */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">Geolocation targeting</Text>
          {!limits.geolocation && (
            <Text as="p" variant="bodySm" tone="subdued">
              Available with Essential plan.{" "}
              <a href="/app/billing" style={{ color: "#005bd3" }}>Upgrade now</a>.
            </Text>
          )}
          <BlockStack gap="100">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="radio" name="geoTarget" value="all" defaultChecked />
              All world
            </label>
            <Text as="p" variant="bodySm" tone="subdued">
              <span style={{ paddingLeft: 24, display: "block" }}>Excluding specific countries from other badges</span>
            </Text>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: !limits.geolocation ? "not-allowed" : "pointer", fontSize: 14, opacity: !limits.geolocation ? 0.5 : 1 }}>
              <input type="radio" name="geoTarget" value="specific" disabled={!limits.geolocation} />
              Specific countries
            </label>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );

  // =========================================================================
  // Live Preview (simplified — no product page simulation)
  // =========================================================================
  const livePreview = (
    <Card>
      <BlockStack gap="300">
        <div style={{
          padding: "20px",
          background: "#f6f6f7",
          borderRadius: 8,
          minHeight: 100,
        }}>
          {badges.length > 0 ? (
            <div
              style={{
                background: bgGradient
                  ? `linear-gradient(135deg, ${bgColor}, ${bgColorEnd})`
                  : bgColor,
                borderRadius: `${cornerRadius}px`,
                border: borderSize > 0 ? `${borderSize}px solid ${borderColor}` : "none",
                padding: `${paddingTop}px 12px ${paddingBottom}px`,
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
                    maxWidth: `${Math.min(maxWidth, 520)}px`,
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

              {/* compact_grid: tight grid, smaller icons, 4+ per row */}
              {badgeType === "compact_grid" && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
                  gap: `${Math.max(spacing, 6)}px`,
                  maxWidth: `${Math.min(maxWidth, 520)}px`,
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
                        <span style={{ fontSize: `${Math.min(fontSize, 11)}px`, fontWeight: 500, color: textColor, textAlign: "center", lineHeight: 1.2, maxWidth: `${payIconSize + 12}px`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{badge.label}</span>
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
                  maxWidth: `${Math.min(maxWidth, 520)}px`,
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
                    maxWidth: `${Math.min(maxWidth, 520)}px`,
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
                        flex: "0 0 auto",
                        minWidth: `${iconSize + 16}px`,
                        maxWidth: "110px",
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
                      <span style={{ fontSize: `${fontSize}px`, fontWeight: 600, color: textColor, textAlign: "center", lineHeight: 1.2, overflowWrap: "break-word", width: "100%" }}>{badge.label}</span>
                      {badge.subtitle && (
                        <span style={{ fontSize: `${subtitleFontSize}px`, fontWeight: 400, color: subtitleColor, textAlign: "center", lineHeight: 1.3, overflowWrap: "break-word", width: "100%" }}>{badge.subtitle}</span>
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
          content: "Duplicate",
          onAction: () => {},
        },
        {
          content: "Delete",
          onAction: () => {},
          destructive: true,
        },
        {
          content: isSaving ? "Saving..." : "Save Draft",
          onAction: () => handleSave("draft"),
          loading: isSaving,
          destructive: false,
        },
      ]}
      backAction={{ content: "Your badges", url: "/app" }}
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

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 40fr) minmax(0, 60fr)", gap: "20px", alignItems: "start" }}>
          {/* Left column: Tabbed editor */}
          <div>
            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  {tabContent[selectedTab]}
                </Box>
              </Tabs>
            </Card>
          </div>

          {/* Right column: Live Preview sticky */}
          <div style={{ position: "sticky", top: 16 }}>
            {livePreview}
          </div>
        </div>

        {/* Add Badge Modal */}
        <Modal
          open={addModalOpen}
          onClose={() => { setAddModalOpen(false); setCategoryFilter("all"); }}
          title="Add a Trust Badge"
          large
          primaryAction={{
            content: "Done",
            onAction: () => { setAddModalOpen(false); setCategoryFilter("all"); },
          }}
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
