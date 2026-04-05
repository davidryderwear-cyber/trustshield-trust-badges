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

  try {
    // Use transaction for atomic dedup + insert
    await prisma.$transaction(async (tx) => {
      // Verify test exists and is running
      const test = await tx.aBTest.findUnique({ where: { id: testId } });
      if (!test || test.status !== "running") return;

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
