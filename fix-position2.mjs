import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
const session = await p.session.findFirst();
const shop = session.shop;
const token = session.accessToken;

// Read the product template via REST
const res = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json?asset[key]=templates/product.json`, {
  headers: { 'X-Shopify-Access-Token': token }
});
const data = await res.json();
const template = JSON.parse(data.asset.value);

// Find the trust badge block key
const trustKey = Object.keys(template.sections.main.blocks).find(k => k.includes('trust'));
console.log('Trust badge key:', trustKey);

// Reorder: move trust badges after buy_buttons
const order = template.sections.main.block_order;
const currentIdx = order.indexOf(trustKey);
if (currentIdx !== -1) order.splice(currentIdx, 1);
const buyIdx = order.indexOf('buy_buttons');
order.splice(buyIdx + 1, 0, trustKey);

console.log('New order:', order.join(', '));

// Try different API versions
for (const version of ['2025-01', '2024-10', '2024-07', '2024-04']) {
  console.log(`\nTrying API version ${version}...`);
  const putRes = await fetch(`https://${shop}/admin/api/${version}/themes/157736272095/assets.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({
      asset: { key: 'templates/product.json', value: JSON.stringify(template, null, 2) }
    })
  });

  if (putRes.status === 200) {
    const putData = await putRes.json();
    console.log(`SUCCESS with ${version}! Asset key:`, putData.asset?.key);
    break;
  } else {
    console.log(`Failed with ${version}: status ${putRes.status}`);
  }
}

await p.$disconnect();
