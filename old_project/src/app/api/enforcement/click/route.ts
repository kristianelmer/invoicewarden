import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOpenTrackingToken } from "@/lib/open-tracking";

function fallbackUrl(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  return `${baseUrl}/dashboard`;
}

function safeRedirectTarget(targetUrl: string | undefined, request: Request) {
  if (!targetUrl) return fallbackUrl(request);

  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fallbackUrl(request);
    }
    return parsed.toString();
  } catch {
    return fallbackUrl(request);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(fallbackUrl(request), { status: 302 });
  }

  const payload = verifyOpenTrackingToken(token);
  if (!payload || payload.kind !== "click") {
    return NextResponse.redirect(fallbackUrl(request), { status: 302 });
  }

  const supabase = createAdminClient();
  const userAgent = request.headers.get("user-agent") || null;
  const forwardedFor = request.headers.get("x-forwarded-for") || null;
  const ip = forwardedFor?.split(",")[0]?.trim() || null;

  await supabase.from("invoice_events").insert({
    user_id: payload.userId,
    invoice_id: payload.invoiceId,
    event_type: "payment_link_clicked",
    payload: {
      tracking_id: payload.trackingId,
      clicked_at: new Date().toISOString(),
      user_agent: userAgent,
      ip,
      target_url: payload.targetUrl ?? null,
    },
  });

  return NextResponse.redirect(safeRedirectTarget(payload.targetUrl, request), {
    status: 302,
  });
}
