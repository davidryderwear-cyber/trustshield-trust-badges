import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();

const session = await p.session.findFirst();
const config = await p.badgeConfig.findFirst();
const shop = config.shop;
const token = session.accessToken;

// First get shop GID
const shopRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({ query: '{ shop { id } }' })
});
const shopData = await shopRes.json();
const shopGid = shopData.data.shop.id;
console.log('Shop GID:', shopGid);

// Build badge payload
const badges = JSON.parse(config.badges);
const BADGE_ICONS = {
  secure_checkout: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  visa: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  free_shipping: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  money_back: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>'
};

const transformedBadges = badges.filter(b => b.enabled !== false).map(b => ({
  label: b.label || '',
  svg: BADGE_ICONS[b.iconKey] || '',
  imageUrl: '',
  type: b.type || 'preset'
}));

const payload = {
  badges: transformedBadges,
  layout: config.layout || 'horizontal',
  alignment: config.alignment || 'center',
  iconSize: config.iconSize || 40,
  iconColor: config.iconColor || '#333333',
  textColor: config.textColor || '#333333',
  fontSize: config.fontSize || 13,
  spacing: config.spacing || 12,
  maxWidth: config.maxWidth || 600,
  showOnProduct: config.showOnProduct ?? true,
  showOnCart: config.showOnCart ?? false,
  showOnHome: config.showOnHome ?? false,
  plan: config.plan || 'free',
};

console.log('Badges:', payload.badges.map(b => b.label).join(', '));

const query = `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id namespace key }
    userErrors { field message }
  }
}`;

const mutationRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({
    query,
    variables: {
      metafields: [{
        namespace: 'trust_badges',
        key: 'config',
        type: 'json',
        value: JSON.stringify(payload),
        ownerId: shopGid
      }]
    }
  })
});

const result = await mutationRes.json();
if (result.data?.metafieldsSet?.userErrors?.length > 0) {
  console.log('ERRORS:', JSON.stringify(result.data.metafieldsSet.userErrors));
} else if (result.errors) {
  console.log('GraphQL errors:', JSON.stringify(result.errors));
} else {
  console.log('SUCCESS! Metafield ID:', result.data?.metafieldsSet?.metafields?.[0]?.id);
}

await p.$disconnect();
