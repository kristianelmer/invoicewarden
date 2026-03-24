import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,stripe_connect_account_id,stripe_connect_onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  if (!profile?.stripe_connect_account_id) {
    return NextResponse.json({
      connected: false,
      accountId: null,
      onboarded: false,
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    });
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

  const onboarded =
    Boolean(account.details_submitted) &&
    Boolean(account.charges_enabled) &&
    Boolean(account.payouts_enabled);

  if (onboarded !== Boolean(profile.stripe_connect_onboarded)) {
    await supabase
      .from("profiles")
      .update({ stripe_connect_onboarded: onboarded })
      .eq("id", user.id);
  }

  return NextResponse.json({
    connected: true,
    accountId: profile.stripe_connect_account_id,
    onboarded,
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
  });
}
