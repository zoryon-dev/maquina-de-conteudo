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
        break;
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

  const emailAddress = primaryEmail?.email_address || "";

  // Check if user already exists by Clerk ID
  const existingById = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (existingById.length > 0) {
    console.log("[Clerk Webhook] User already exists by ID:", id);
    return;
  }

  // Check if email already exists (account recreation scenario)
  if (emailAddress) {
    const existingByEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailAddress))
      .limit(1);

    if (existingByEmail.length > 0) {
      // Email exists with different Clerk ID - update the existing record
      console.log(
        "[Clerk Webhook] Email already exists with old ID:",
        existingByEmail[0].id,
        "- updating to new Clerk ID:",
        id
      );

      // Update existing user with new Clerk ID
      await db
        .update(users)
        .set({
          id: id,
          name: [first_name, last_name].filter(Boolean).join(" ") || null,
          avatarUrl: image_url || null,
          updatedAt: new Date(),
          deletedAt: null, // Reactivate if soft-deleted
        })
        .where(eq(users.email, emailAddress));

      console.log("[Clerk Webhook] User ID updated successfully");
      return;
    }
  }

  // Create new user
  await db.insert(users).values({
    id,
    email: emailAddress,
    name: [first_name, last_name].filter(Boolean).join(" ") || null,
    avatarUrl: image_url || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("[Clerk Webhook] Created new user:", id);
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
