import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Verify Clerk webhook signature
async function verifySignature(payload: string, signature: string) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set");
  }

  const webhookSecret = secret.startsWith("whsec_")
    ? secret
    : `whsec_${secret}`;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}

export async function POST(request: Request) {
  // Get headers
  const headersList = await headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  // Get raw body for verification
  const payload = await request.text();
  const body = JSON.parse(payload);

  // Verify webhook signature
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 400 }
    );
  }

  const signatureParts = svixSignature.split(",");
  const signature = signatureParts[1]?.split("=")[1];

  const isValid = await verifySignature(payload, signature || "");
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // Handle events
  const eventType = body.type;
  const data = body.data;

  try {
    switch (eventType) {
      case "user.created": {
        await handleUserCreated(data);
        break;
      }
      case "user.updated": {
        await handleUserUpdated(data);
        break;
      }
      case "user.deleted": {
        await handleUserDeleted(data);
        break;
      }
      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleUserCreated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  const primaryEmail = email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await db.insert(users).values({
    id,
    email: primaryEmail?.email_address || "",
    name: [first_name, last_name].filter(Boolean).join(" ") || null,
    avatarUrl: image_url || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function handleUserUpdated(data: any) {
  const { id, email_addresses, first_name, last_name, image_url } = data;

  const primaryEmail = email_addresses.find(
    (email: any) => email.id === data.primary_email_address_id
  );

  await db
    .update(users)
    .set({
      email: primaryEmail?.email_address,
      name: [first_name, last_name].filter(Boolean).join(" ") || null,
      avatarUrl: image_url || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}

async function handleUserDeleted(data: any) {
  const { id } = data;

  // Soft delete
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
}
