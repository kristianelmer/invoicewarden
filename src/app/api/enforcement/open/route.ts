import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOpenTrackingToken } from "@/lib/open-tracking";

const TRANSPARENT_GIF_BASE64 = "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    const payload = verifyOpenTrackingToken(token);

    if (payload && payload.kind === "open") {
      const supabase = createAdminClient();
      const userAgent = request.headers.get("user-agent") || null;
      const forwardedFor = request.headers.get("x-forwarded-for") || null;
      const ip = forwardedFor?.split(",")[0]?.trim() || null;

      await supabase.from("invoice_events").insert({
        user_id: payload.userId,
        invoice_id: payload.invoiceId,
        event_type: "payment_link_opened",
        payload: {
          tracking_id: payload.trackingId,
          opened_at: new Date().toISOString(),
          user_agent: userAgent,
          ip,
        },
      });
    }
  }

  const gifBuffer = Buffer.from(TRANSPARENT_GIF_BASE64, "base64");

  return new NextResponse(gifBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(gifBuffer.length),
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
