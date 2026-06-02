// Public Terms of Service — NO authentication, reachable by anyone (App Store
// requires a publicly accessible policy URL). Served as standalone HTML.
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terms of Service - TrustShield Trust Badges</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; color: #333; }
h1 { color: #1a1a1a; border-bottom: 2px solid #2d7ff9; padding-bottom: 10px; }
h2 { color: #1a1a1a; margin-top: 30px; font-size: 1.15em; }
p, li { margin: 10px 0; }
a { color: #2d7ff9; }
</style>
</head>
<body>
<h1>Terms of Service for TrustShield Trust Badges</h1>
<p><strong>Last updated: June 2, 2026</strong></p>

<h2>1. Acceptance of Terms</h2>
<p>By installing and using TrustShield Trust Badges ("the App"), you agree to these Terms of Service. If you do not agree, please uninstall the App from your Shopify store.</p>

<h2>2. Description of Service</h2>
<p>TrustShield provides customizable trust badge icons and banners for your Shopify storefront. The App allows you to configure, style, and display trust signals on product pages and cart drawers to build customer confidence.</p>

<h2>3. Account and Access</h2>
<p>You must have an active Shopify store to use TrustShield. The App accesses your store through Shopify's OAuth system and requires the permissions listed during installation. You are responsible for maintaining the security of your Shopify account.</p>

<h2>4. Pricing and Billing</h2>
<p>TrustShield offers a free tier and paid subscription plans billed through Shopify's billing system. Paid plans include a 7-day free trial. You may cancel at any time from your Shopify admin. Refunds are handled in accordance with Shopify's refund policies. We offer a 30-day money-back guarantee on all paid plans.</p>

<h2>5. Acceptable Use</h2>
<p>You agree not to use the App to display misleading, fraudulent, or deceptive trust signals. Badge labels and icons should accurately represent your store's policies (e.g., do not display "Free Shipping" if you charge for shipping).</p>

<h2>6. Intellectual Property</h2>
<p>The App, including its code, design, and built-in icons, is the intellectual property of Makaveli Digital. You are granted a non-exclusive, non-transferable license to use the App on your Shopify store while your subscription is active. Custom icons you upload remain your property.</p>

<h2>7. Data and Privacy</h2>
<p>Your use of the App is also governed by our <a href="/privacy">Privacy Policy</a>. TrustShield does not collect or store any of your customers' personal data. We only store your badge configuration settings, store domain, and account email.</p>

<h2>8. Limitation of Liability</h2>
<p>TrustShield is provided "as is" without warranty. We are not liable for any indirect, incidental, or consequential damages arising from your use of the App, including but not limited to lost sales, data loss, or store downtime. Our total liability is limited to the amount you paid for the App in the preceding 12 months.</p>

<h2>9. Modifications</h2>
<p>We may update these Terms at any time. Continued use of the App after changes constitutes acceptance. Material changes will be communicated through the App or via email.</p>

<h2>10. Termination</h2>
<p>Either party may terminate this agreement at any time. You may uninstall the App from your Shopify admin. We reserve the right to suspend or terminate access for violations of these Terms.</p>

<h2>11. Contact</h2>
<p>For questions about these Terms, contact us at <a href="mailto:support@makaveli.digital">support@makaveli.digital</a>.</p>
</body>
</html>`;

export const loader = () =>
  new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
