import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name} in .env.local`);
  }

  return value;
}

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));

type RequestBody = {
  pageId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const partnerPriceId = requiredEnv(
      "STRIPE_LOCAL_PARTNER_PRICE_ID",
    );

    const body = (await request.json()) as RequestBody;

    const pageId =
      typeof body.pageId === "string"
        ? body.pageId.trim()
        : "";

    if (!pageId) {
      return NextResponse.json(
        { error: "Choose a Page before continuing." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    const { data: page, error: pageError } = await supabase
      .from("groups")
      .select(
        `
          id,
          name,
          user_id,
          status,
          is_local_partner
        `,
      )
      .eq("id", pageId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (pageError) {
      throw new Error(pageError.message);
    }

    if (!page) {
      return NextResponse.json(
        { error: "That Page could not be found." },
        { status: 404 },
      );
    }

    if (page.status !== "approved") {
      return NextResponse.json(
        {
          error:
            "Only approved Pages can become Local Partners.",
        },
        { status: 400 },
      );
    }

    if (page.is_local_partner) {
      return NextResponse.json(
        {
          error:
            "That Page is already a Local Partner.",
        },
        { status: 409 },
      );
    }

    const origin = new URL(request.url).origin;

    const session =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",

        line_items: [
          {
            price: partnerPriceId,
            quantity: 1,
          },
        ],

        customer_email: user.email || undefined,

        return_url:
          `${origin}/localpartner/return` +
          "?session_id={CHECKOUT_SESSION_ID}",

        metadata: {
          page_id: page.id,
          user_id: user.id,
        },

        subscription_data: {
          metadata: {
            page_id: page.id,
            user_id: user.id,
          },
        },
      });

    if (!session.client_secret) {
      throw new Error(
        "Stripe did not return a Checkout client secret.",
      );
    }

    return NextResponse.json({
      clientSecret: session.client_secret,
    });
  } catch (error) {
    console.error(
      "Failed to create embedded Checkout Session:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Checkout could not be started.",
      },
      { status: 500 },
    );
  }
}