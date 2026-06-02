import prisma from "../db.server";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

const HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

// Best-effort in-memory IP rate limiter. Bounds abusive metric/DB-write flooding
// from a single source. Per-instance and resets on restart — not a hard guarantee,
// but combined with session dedup + the per-test cap it neutralizes cheap abuse.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const ipHits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  ipHits.set(ip, recent);
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) ipHits.delete(k);
    }
  }
  return recent.length > RATE_LIMIT_MAX;
}

// Hard ceiling on recorded events per test to prevent storage exhaustion.
const MAX_EVENTS_PER_TEST = 1_000_000;

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const testId = url.searchParams.get("testId");
  const variant = url.searchParams.get("variant");
  const eventType = url.searchParams.get("event");
  const sessionId = url.searchParams.get("sid");

  // Validate params
  if (
    !testId ||
    !["control", "variant"].includes(variant) ||
    !["impression", "conversion"].includes(eventType) ||
    !sessionId ||
    sessionId.length > 50 ||
    testId.length > 50
  ) {
    return new Response(PIXEL, { status: 200, headers: HEADERS });
  }

  // Rate limit by client IP — silently drop excess without revealing the limit
  if (isRateLimited(clientIp(request))) {
    return new Response(PIXEL, { status: 200, headers: HEADERS });
  }

  try {
    // Use transaction for atomic dedup + insert
    await prisma.$transaction(async (tx) => {
      // Verify test exists and is running
      const test = await tx.aBTest.findUnique({ where: { id: testId } });
      if (!test || test.status !== "running") return;

      // Storage-exhaustion guard: stop recording once the test hits the ceiling
      const recorded =
        test.controlImpressions + test.controlConversions +
        test.variantImpressions + test.variantConversions;
      if (recorded >= MAX_EVENTS_PER_TEST) return;

      // Deduplication check
      const existing = await tx.aBEvent.findFirst({
        where: { testId, sessionId, eventType, variant },
      });
      if (existing) return;

      // Record the event
      await tx.aBEvent.create({
        data: { testId, variant, eventType, sessionId },
      });

      // Increment aggregate counter atomically
      const field =
        variant === "control"
          ? eventType === "impression"
            ? "controlImpressions"
            : "controlConversions"
          : eventType === "impression"
            ? "variantImpressions"
            : "variantConversions";

      await tx.aBTest.update({
        where: { id: testId },
        data: { [field]: { increment: 1 } },
      });
    });
  } catch (error) {
    console.error(`AB tracking error for test ${testId}, variant ${variant}, event ${eventType}:`, error);
  }

  return new Response(PIXEL, { status: 200, headers: HEADERS });
};
