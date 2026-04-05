import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
const session = await p.session.findFirst();
const shop = session.shop;
const token = session.accessToken;

// Read template via REST
const res = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json?asset[key]=templates/product.json`, {
  headers: { 'X-Shopify-Access-Token': token }
});
const data = await res.json();
const template = JSON.parse(data.asset.value);

// Add block
const extUid = '83f08cbb-aa88-01b9-d3ec-b52c58257a6b4d3ce245';
template.sections.main.blocks['trust_badges_app'] = {
  type: `shopify://apps/rustshield-trust-badges/blocks/trust-badges/${extUid}`,
  settings: {}
};
const idx = template.sections.main.block_order.indexOf('buy_buttons');
template.sections.main.block_order.splice(idx + 1, 0, 'trust_badges_app');

console.log('Block order:', template.sections.main.block_order.join(', '));

// Write via GraphQL
const query = `mutation themeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
  themeFilesUpsert(themeId: $themeId, files: $files) {
    upsertedThemeFiles { filename }
    userErrors { field message }
  }
}`;

const gqlRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({
    query,
    variables: {
      themeId: 'gid://shopify/OnlineStoreTheme/157736272095',
      files: [{
        filename: 'templates/product.json',
        body: { type: 'TEXT', value: JSON.stringify(template, null, 2) }
      }]
    }
  })
});

const gqlData = await gqlRes.json();
if (gqlData.data?.themeFilesUpsert?.userErrors?.length > 0) {
  console.log('User errors:', JSON.stringify(gqlData.data.themeFilesUpsert.userErrors));
} else if (gqlData.errors) {
  console.log('GraphQL errors:', JSON.stringify(gqlData.errors));
} else {
  console.log('SUCCESS!', JSON.stringify(gqlData.data?.themeFilesUpsert));
}

await p.$disconnect();
