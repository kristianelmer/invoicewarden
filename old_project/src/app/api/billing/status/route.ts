import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("status,price_id,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    subscription: data,
    isActive: data?.status ? ACTIVE_STATUSES.has(data.status) : false,
  });
}
