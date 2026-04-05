import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();

const session = await p.session.findFirst();
const shop = session.shop;
const token = session.accessToken;

// Read the current product template
const readRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({
    query: `{
      theme(id: "gid://shopify/OnlineStoreTheme/157736272095") {
        files(filenames: ["templates/product.json"], first: 1) {
          nodes {
            filename
            body {
              ... on OnlineStoreThemeFileBodyText {
                content
              }
            }
          }
        }
      }
    }`
  })
});

const readData = await readRes.json();
const content = readData.data?.theme?.files?.nodes?.[0]?.body?.content;

if (!content) {
  // Might not have read_themes via GraphQL. Try REST instead.
  console.log('GraphQL read failed, trying REST...');
  const restRes = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json?asset[key]=templates/product.json`, {
    headers: { 'X-Shopify-Access-Token': token }
  });
  const restData = await restRes.json();

  if (!restData.asset?.value) {
    console.log('REST also failed:', JSON.stringify(restData).substring(0, 200));
    await p.$disconnect();
    process.exit(1);
  }

  const template = JSON.parse(restData.asset.value);
  console.log('Current blocks:', Object.keys(template.sections.main.blocks).join(', '));

  // Add the trust badges block
  const extUid = '83f08cbb-aa88-01b9-d3ec-b52c58257a6b4d3ce245';
  template.sections.main.blocks['trust_badges_app'] = {
    type: `shopify://apps/rustshield-trust-badges/blocks/trust-badges/${extUid}`,
    settings: {}
  };

  const idx = template.sections.main.block_order.indexOf('buy_buttons');
  if (idx !== -1) {
    template.sections.main.block_order.splice(idx + 1, 0, 'trust_badges_app');
  } else {
    template.sections.main.block_order.push('trust_badges_app');
  }

  // Try writing via REST
  const putRes = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({
      asset: { key: 'templates/product.json', value: JSON.stringify(template, null, 2) }
    })
  });

  if (putRes.status === 200) {
    console.log('SUCCESS via REST! Block added');
  } else {
    const putData = await putRes.json();
    console.log('REST write failed (status ' + putRes.status + '):', JSON.stringify(putData).substring(0, 300));

    // If 403/404, try GraphQL themeFilesUpsert
    console.log('\nTrying GraphQL themeFilesUpsert...');
    const gqlRes = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({
        query: `mutation themeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
          themeFilesUpsert(themeId: $themeId, files: $files) {
            upsertedThemeFiles { filename }
            userErrors { field message }
          }
        }`,
        variables: {
          themeId: "gid://shopify/OnlineStoreTheme/157736272095",
          files: [{
            filename: "templates/product.json",
            body: { type: "TEXT", value: JSON.stringify(template, null, 2) }
          }]
        }
      })
    });
    const gqlData = await gqlRes.json();
    if (gqlData.data?.themeFilesUpsert?.userErrors?.length > 0) {
      console.log('GQL user errors:', JSON.stringify(gqlData.data.themeFilesUpsert.userErrors));
    } else if (gqlData.errors) {
      console.log('GQL errors:', JSON.stringify(gqlData.errors));
    } else {
      console.log('SUCCESS via GraphQL!');
    }
  }
} else {
  const template = JSON.parse(content);
  console.log('Read via GraphQL. Blocks:', Object.keys(template.sections.main.blocks).join(', '));
  // Same logic...
}

await p.$disconnect();
