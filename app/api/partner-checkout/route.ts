import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not signed in" },
        { status: 401 }
      );
    }

    const { data: page } = await supabase
      .from("groups")
      .select("id, name")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!page) {
      return NextResponse.json(
        { error: "No page found" },
        { status: 403 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_LOCAL_PARTNER_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/partner/success`,
      cancel_url: `${siteUrl}/partner`,
      client_reference_id: page.id,
      metadata: {
        group_id: page.id,
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}