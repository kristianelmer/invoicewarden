import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!profile?.stripe_connect_account_id) {
    return NextResponse.json({ error: "No connected Stripe account" }, { status: 400 });
  }

  const stripe = getStripeClient();
  const link = await stripe.accounts.createLoginLink(profile.stripe_connect_account_id);

  return NextResponse.json({ url: link.url });
}
