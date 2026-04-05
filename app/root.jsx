import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Error - Trust Badges</title>
      </head>
      <body>
        <div style={{ padding: "40px", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ color: "#666" }}>Please try refreshing the page. If the problem persists, contact support.</p>
        </div>
      </body>
    </html>
  );
}
