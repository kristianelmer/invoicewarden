import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe';

function normalizeCountry(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id,stripe_connect_account_id')
      .eq('id', auth.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (!existingProfile) {
      const { error: insertProfileError } = await supabase.from('profiles').insert({
        id: auth.user.id,
        full_name: (auth.user.user_metadata?.full_name as string | undefined) ?? null,
        timezone: 'UTC'
      });

      if (insertProfileError) {
        return NextResponse.json({ error: insertProfileError.message }, { status: 400 });
      }
    }

    const stripe = getStripeClient();

    let accountId = existingProfile?.stripe_connect_account_id ?? null;

    if (!accountId) {
      const userCountry = normalizeCountry(auth.user.user_metadata?.country as string | undefined);
      const defaultCountry = normalizeCountry(process.env.STRIPE_CONNECT_DEFAULT_COUNTRY) ?? 'GB';
      const country = userCountry ?? defaultCountry;

      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email: auth.user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        metadata: {
          userId: auth.user.id
        }
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_connect_account_id: account.id, stripe_connect_onboarded: false })
        .eq('id', auth.user.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${baseUrl}/dashboard/settings?connect=refresh`,
      return_url: `${baseUrl}/dashboard/settings?connect=return`
    });

    return NextResponse.json({ url: accountLink.url, accountId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe Connect onboarding failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
