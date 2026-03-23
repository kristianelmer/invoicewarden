import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Missing STRIPE_PRICE_ID" },
      { status: 500 }
    );
  }

  const stripe = getStripeClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/dashboard?billing=cancelled`,
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
    },
    allow_promotion_codes: true,
  });

  return NextResponse.json({
    id: checkoutSession.id,
    url: checkoutSession.url,
  });
}
