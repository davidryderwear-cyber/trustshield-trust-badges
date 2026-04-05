import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
const session = await p.session.findFirst();
const shop = session.shop;
const token = session.accessToken;

// Read the product template
const res = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json?asset[key]=templates/product.json`, {
  headers: { 'X-Shopify-Access-Token': token }
});
const data = await res.json();
const template = JSON.parse(data.asset.value);

console.log('BEFORE block order:', template.sections.main.block_order.join(', '));

// Find the trust badge block key
const trustKey = Object.keys(template.sections.main.blocks).find(k => k.includes('trust'));
if (!trustKey) {
  console.log('No trust badge block found!');
  process.exit(1);
}

console.log('Trust badge key:', trustKey);

// Remove from current position
const order = template.sections.main.block_order;
const currentIdx = order.indexOf(trustKey);
if (currentIdx !== -1) {
  order.splice(currentIdx, 1);
}

// Insert after buy_buttons
const buyIdx = order.indexOf('buy_buttons');
if (buyIdx !== -1) {
  order.splice(buyIdx + 1, 0, trustKey);
} else {
  // Fallback: add at end
  order.push(trustKey);
}

console.log('AFTER block order:', order.join(', '));

// Write back
const putRes = await fetch(`https://${shop}/admin/api/2025-01/themes/157736272095/assets.json`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
  body: JSON.stringify({
    asset: { key: 'templates/product.json', value: JSON.stringify(template, null, 2) }
  })
});

const putData = await putRes.json();
if (putRes.status === 200 && putData.asset) {
  console.log('SUCCESS! Template updated. Trust badges now after Buy buttons.');
} else {
  console.log('Failed (status ' + putRes.status + '):', JSON.stringify(putData).substring(0, 300));
}

await p.$disconnect();
