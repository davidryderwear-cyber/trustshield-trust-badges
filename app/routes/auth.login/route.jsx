import { useState } from "react";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  AppProvider,
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
} from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { login } from "../../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  const errors = await login(request);
  return json({ errors });
};

export const action = async ({ request }) => {
  const errors = await login(request);
  return json({ errors });
};

export default function Auth() {
  const { errors } = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const allErrors = { ...(errors || {}), ...(actionData?.errors || {}) };

  return (
    <AppProvider i18n={{}}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="e.g: my-shop.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={allErrors.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </AppProvider>
  );
}
