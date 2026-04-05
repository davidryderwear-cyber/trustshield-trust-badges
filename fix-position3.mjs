import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
const session = await p.session.findFirst();
const shop = session.shop;
const token = session.accessToken;

// Read the product template via REST (works)
const res = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json?asset[key]=templates/product.json`, {
  headers: { 'X-Shopify-Access-Token': token }
});
const data = await res.json();
const template = JSON.parse(data.asset.value);

// Reorder: move trust badges after buy_buttons
const trustKey = Object.keys(template.sections.main.blocks).find(k => k.includes('trust'));
const order = template.sections.main.block_order;
const currentIdx = order.indexOf(trustKey);
if (currentIdx !== -1) order.splice(currentIdx, 1);
const buyIdx = order.indexOf('buy_buttons');
order.splice(buyIdx + 1, 0, trustKey);
console.log('New order:', order.join(', '));

const newValue = JSON.stringify(template, null, 2);

// Try GraphQL themeFilesUpsert
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
        body: { type: 'TEXT', value: newValue }
      }]
    }
  })
});

const gqlData = await gqlRes.json();
if (gqlData.data?.themeFilesUpsert?.upsertedThemeFiles?.length > 0) {
  console.log('SUCCESS via GraphQL! Files:', gqlData.data.themeFilesUpsert.upsertedThemeFiles.map(f => f.filename));
} else if (gqlData.data?.themeFilesUpsert?.userErrors?.length > 0) {
  console.log('User errors:', JSON.stringify(gqlData.data.themeFilesUpsert.userErrors));
} else if (gqlData.errors) {
  // Check if it's an access denied error
  const errMsg = gqlData.errors[0]?.message || '';
  if (errMsg.includes('Access denied')) {
    console.log('Access denied for themeFilesUpsert. Trying alternative...');

    // Try the older REST approach with a different path
    // Some Shopify stores use /admin/api/{version}/themes/{id}/assets
    // vs /admin/api/{version}/themes/{id}/assets.json
    const altRes = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ asset: { key: 'templates/product.json', value: newValue } })
    });
    console.log('Alt REST status:', altRes.status);
    if (altRes.status === 200) {
      console.log('SUCCESS via alt REST!');
    }
  }
  console.log('GQL errors:', JSON.stringify(gqlData.errors[0]?.message).substring(0, 200));
}

await p.$disconnect();
