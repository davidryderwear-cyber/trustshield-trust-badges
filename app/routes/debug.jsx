import { json } from "@remix-run/node";

export const loader = async () => {
  return json({
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "(not set)",
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? "set (" + process.env.SHOPIFY_API_KEY.substring(0, 8) + "...)" : "(not set)",
    NODE_ENV: process.env.NODE_ENV || "(not set)",
  });
};
