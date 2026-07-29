import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));

const supabaseAdmin = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

function getId(
  value:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | Stripe.Subscription
    | null,
) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function activatePartner(
  session: Stripe.Checkout.Session,
) {
  const pageId = session.metadata?.page_id;
  const userId = session.metadata?.user_id;

  if (!pageId || !userId) {
    throw new Error(
      "Stripe Session is missing page_id or user_id metadata.",
    );
  }

  const { data, error } = await supabaseAdmin
    .from("groups")
    .update({
      is_local_partner: true,
      stripe_customer_id: getId(session.customer),
      stripe_subscription_id: getId(
        session.subscription,
      ),
      partner_status: "active",
      partner_started_at: new Date().toISOString(),
    })
    .eq("id", pageId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      "The selected Page could not be updated.",
    );
  }
}

async function syncSubscription(
  subscription: Stripe.Subscription,
) {
  const pageId = subscription.metadata.page_id;

  if (!pageId) return;

  const isActive =
    subscription.status === "active" ||
    subscription.status === "trialing";

  const { error } = await supabaseAdmin
    .from("groups")
    .update({
      is_local_partner: isActive,
      stripe_customer_id: getId(
        subscription.customer,
      ),
      stripe_subscription_id: subscription.id,
      partner_status: subscription.status,
    })
    .eq("id", pageId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get(
    "stripe-signature",
  );

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch (error) {
    console.error(
      "Invalid Stripe webhook signature:",
      error,
    );

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        if (
          session.mode === "subscription" &&
          session.payment_status !== "unpaid"
        ) {
          await activatePartner(session);
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      `Failed to process ${event.type}:`,
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}