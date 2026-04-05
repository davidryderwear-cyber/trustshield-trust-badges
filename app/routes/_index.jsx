import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  // Preserve all query parameters when redirecting to /app
  // This is critical for embedded auth (shop, host, embedded params)
  return redirect(`/app${url.search}`);
};
