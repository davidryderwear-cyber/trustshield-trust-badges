import { Page, Layout, Card, BlockStack, Text } from "@shopify/polaris";

export default function Privacy() {
  return (
    <Page title="Privacy Policy" backAction={{ content: "Dashboard", url: "/app" }}>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Privacy Policy for TrustShield - Trust Badges</Text>

              <Text as="p" variant="bodyMd">
                Last updated: April 2026
              </Text>

              <Text as="h3" variant="headingSm">What data we collect</Text>
              <Text as="p" variant="bodyMd">
                TrustShield collects and stores only the data necessary to provide
                the trust badge service to your Shopify store:
              </Text>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd">• Your Shopify store domain (to associate your badge configuration)</Text>
                <Text as="p" variant="bodyMd">• Badge configuration settings (layout, colors, icon selections)</Text>
                <Text as="p" variant="bodyMd">• Custom badge image URLs (if you upload custom badges)</Text>
                <Text as="p" variant="bodyMd">• Billing plan status</Text>
              </BlockStack>

              <Text as="h3" variant="headingSm">What data we do NOT collect</Text>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd">• We do NOT collect any customer data from your store</Text>
                <Text as="p" variant="bodyMd">• We do NOT collect any order information</Text>
                <Text as="p" variant="bodyMd">• We do NOT collect any personal information from your store visitors</Text>
                <Text as="p" variant="bodyMd">• We do NOT use cookies or tracking on your storefront</Text>
              </BlockStack>

              <Text as="h3" variant="headingSm">How we use your data</Text>
              <Text as="p" variant="bodyMd">
                Your badge configuration data is used solely to render trust badges
                on your storefront. We do not sell, share, or use your data for any
                other purpose.
              </Text>

              <Text as="h3" variant="headingSm">Data retention</Text>
              <Text as="p" variant="bodyMd">
                When you uninstall the app, all your data (badge configurations,
                custom badges, and session data) is automatically deleted from our
                servers. No data is retained after uninstallation.
              </Text>

              <Text as="h3" variant="headingSm">GDPR compliance</Text>
              <Text as="p" variant="bodyMd">
                We comply with GDPR, CCPA, and other applicable data protection
                regulations. Since we do not collect customer data, there is no
                customer data to export or delete. Shop data is deleted upon
                uninstallation or upon receiving a shop redaction request from Shopify.
              </Text>

              <Text as="h3" variant="headingSm">Contact</Text>
              <Text as="p" variant="bodyMd">
                For privacy-related questions, contact us at privacy@makaveli.digital
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
