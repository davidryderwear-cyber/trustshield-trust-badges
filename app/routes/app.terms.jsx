import { Page, Layout, Card, BlockStack, Text } from "@shopify/polaris";

export default function Terms() {
  return (
    <Page title="Terms of Service" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Terms of Service for TrustShield Trust Badges</Text>

              <Text as="p" variant="bodyMd">
                Last updated: April 2026
              </Text>

              <Text as="h3" variant="headingSm">1. Acceptance of Terms</Text>
              <Text as="p" variant="bodyMd">
                By installing and using TrustShield Trust Badges ("the App"), you agree
                to these Terms of Service. If you do not agree, please uninstall the App
                from your Shopify store.
              </Text>

              <Text as="h3" variant="headingSm">2. Description of Service</Text>
              <Text as="p" variant="bodyMd">
                TrustShield provides customizable trust badge icons and banners for your
                Shopify storefront. The App allows you to configure, style, and display
                trust signals on product pages and cart drawers to build customer confidence.
              </Text>

              <Text as="h3" variant="headingSm">3. Account and Access</Text>
              <Text as="p" variant="bodyMd">
                You must have an active Shopify store to use TrustShield. The App accesses
                your store through Shopify's OAuth system and requires the permissions
                listed during installation. You are responsible for maintaining the security
                of your Shopify account.
              </Text>

              <Text as="h3" variant="headingSm">4. Pricing and Billing</Text>
              <Text as="p" variant="bodyMd">
                TrustShield offers a free tier and paid subscription plans billed through
                Shopify's billing system. Paid plans include a 7-day free trial. You may
                cancel at any time from your Shopify admin. Refunds are handled in accordance
                with Shopify's refund policies. We offer a 30-day money-back guarantee on
                all paid plans.
              </Text>

              <Text as="h3" variant="headingSm">5. Acceptable Use</Text>
              <Text as="p" variant="bodyMd">
                You agree not to use the App to display misleading, fraudulent, or deceptive
                trust signals. Badge labels and icons should accurately represent your
                store's policies (e.g., do not display "Free Shipping" if you charge for shipping).
              </Text>

              <Text as="h3" variant="headingSm">6. Intellectual Property</Text>
              <Text as="p" variant="bodyMd">
                The App, including its code, design, and built-in icons, is the intellectual
                property of Makaveli Digital. You are granted a non-exclusive, non-transferable
                license to use the App on your Shopify store while your subscription is active.
                Custom icons you upload remain your property.
              </Text>

              <Text as="h3" variant="headingSm">7. Data and Privacy</Text>
              <Text as="p" variant="bodyMd">
                Your use of the App is also governed by our Privacy Policy. TrustShield
                does not collect or store any of your customers' personal data. We only
                store your badge configuration settings and store domain.
              </Text>

              <Text as="h3" variant="headingSm">8. Limitation of Liability</Text>
              <Text as="p" variant="bodyMd">
                TrustShield is provided "as is" without warranty. We are not liable for any
                indirect, incidental, or consequential damages arising from your use of the
                App, including but not limited to lost sales, data loss, or store downtime.
                Our total liability is limited to the amount you paid for the App in the
                preceding 12 months.
              </Text>

              <Text as="h3" variant="headingSm">9. Modifications</Text>
              <Text as="p" variant="bodyMd">
                We may update these Terms at any time. Continued use of the App after
                changes constitutes acceptance. Material changes will be communicated
                through the App or via email.
              </Text>

              <Text as="h3" variant="headingSm">10. Termination</Text>
              <Text as="p" variant="bodyMd">
                Either party may terminate this agreement at any time. You may uninstall
                the App from your Shopify admin. We reserve the right to suspend or
                terminate access for violations of these Terms.
              </Text>

              <Text as="h3" variant="headingSm">11. Contact</Text>
              <Text as="p" variant="bodyMd">
                For questions about these Terms, contact us at support@makaveli.digital.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
