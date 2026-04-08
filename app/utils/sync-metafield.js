import { BADGE_ICONS } from "./badge-presets";

/** @internal — exported for testing */
export function transformBadges(badgesJson) {
  let badges;
  if (typeof badgesJson === "string") {
    try {
      badges = JSON.parse(badgesJson);
    } catch {
      return [];
    }
  } else if (Array.isArray(badgesJson)) {
    badges = badgesJson;
  } else {
    return [];
  }

  return badges
    .filter((b) => b && b.enabled !== false)
    .map((b) => ({
      label: b.label || "",
      subtitle: b.subtitle || "",
      svg: b.type === "custom" ? "" : (BADGE_ICONS[b.iconKey]?.svg || ""),
      imageUrl: b.type === "custom" ? (b.imageUrl || "") : "",
      type: b.type || "preset",
    }));
}

/**
 * Check if a config should be synced to the storefront.
 * Returns false if draft or outside scheduling window.
 */
export function shouldSync(config) {
  if (config.status === "draft") return false;

  const now = new Date();
  if (config.startsAt && new Date(config.startsAt) > now) return false;
  if (config.endsAt && new Date(config.endsAt) < now) return false;

  return true;
}

/** @internal — exported for testing */
export function buildConfigPayload(config) {
  return {
    badges: transformBadges(config.badges),
    badgeType: config.badgeType || "icon_block",
    layout: config.layout || "horizontal",
    alignment: config.alignment || "center",
    iconSize: config.iconSize || 32,
    iconColor: config.iconColor || "#333333",
    textColor: config.textColor || "#202223",
    fontSize: config.fontSize || 16,
    spacing: config.spacing || 12,
    maxWidth: config.maxWidth || 600,
    showOnProduct: config.showOnProduct ?? true,
    showOnCart: config.showOnCart ?? false,
    showOnHome: config.showOnHome ?? false,
    plan: config.plan || "free",
    // Design — card
    bgColor: config.bgColor || "#ffffff",
    cornerRadius: config.cornerRadius ?? 8,
    borderSize: config.borderSize ?? 0,
    borderColor: config.borderColor || "#c5c8d1",
    // Design — spacing
    paddingTop: config.paddingTop ?? 16,
    paddingBottom: config.paddingBottom ?? 16,
    marginTop: config.marginTop ?? 20,
    marginBottom: config.marginBottom ?? 20,
    // Design — icon
    iconBgColor: config.iconBgColor || "#ffffff",
    iconCornerRadius: config.iconCornerRadius ?? 4,
    useOriginalIconColor: config.useOriginalIconColor ?? false,
    // Design — subtitle
    subtitleFontSize: config.subtitleFontSize ?? 14,
    subtitleColor: config.subtitleColor || "#96a4b6",
    // Placement
    targetType: config.targetType || "all",
  };
}

/**
 * Sync badge configuration to shop metafield.
 * @param {object} admin - Shopify admin API client
 * @param {object} config - BadgeConfig record from DB
 * @param {object|null} abTest - Active A/B test data (optional)
 * @throws {Error} If GraphQL mutation fails
 */
export async function syncMetafield(admin, config, abTest = null) {
  const payload = buildConfigPayload(config);

  // If A/B test is running, include variant data
  if (abTest && abTest.status === "running") {
    let variantConfig;
    try {
      variantConfig = JSON.parse(abTest.variantConfig);
    } catch {
      throw new Error("Invalid variant config JSON in A/B test");
    }

    payload.abTest = {
      testId: abTest.id,
      split: abTest.trafficSplit,
      variant: {
        badges: transformBadges(variantConfig.badges),
        layout: variantConfig.layout || config.layout,
        iconSize: variantConfig.iconSize || config.iconSize,
        iconColor: variantConfig.iconColor || config.iconColor,
        textColor: variantConfig.textColor || config.textColor,
        fontSize: variantConfig.fontSize || config.fontSize,
        spacing: variantConfig.spacing || config.spacing,
        maxWidth: variantConfig.maxWidth || config.maxWidth,
      },
    };
  }

  const metafieldValue = JSON.stringify(payload);

  // First, get the shop's GID
  const shopResponse = await admin.graphql(`{ shop { id } }`);
  const shopResult = await shopResponse.json();
  const shopGid = shopResult?.data?.shop?.id;
  if (!shopGid) {
    throw new Error("Could not retrieve shop GID");
  }

  const response = await admin.graphql(
    `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            namespace: "trust_badges",
            key: "config",
            type: "json",
            value: metafieldValue,
            ownerId: shopGid,
          },
        ],
      },
    }
  );

  const result = await response.json();
  const userErrors = result?.data?.metafieldsSet?.userErrors;
  if (userErrors && userErrors.length > 0) {
    throw new Error(`Metafield sync failed: ${JSON.stringify(userErrors)}`);
  }
}

/**
 * Clear the badge metafield (used when unpublishing / saving as draft).
 */
export async function clearMetafield(admin) {
  const shopResponse = await admin.graphql(`{ shop { id } }`);
  const shopResult = await shopResponse.json();
  const shopGid = shopResult?.data?.shop?.id;
  if (!shopGid) throw new Error("Could not retrieve shop GID");

  const emptyPayload = JSON.stringify({ badges: [] });

  await admin.graphql(
    `
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            namespace: "trust_badges",
            key: "config",
            type: "json",
            value: emptyPayload,
            ownerId: shopGid,
          },
        ],
      },
    }
  );
}
