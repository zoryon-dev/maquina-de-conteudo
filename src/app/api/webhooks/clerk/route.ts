import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  // Verify webhook secret is configured
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Missing webhook secret" },
      { status: 500 }
    );
  }

  // Get svix headers
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  // Get raw body for verification
  const payload = await request.text();

  // Verify with official svix library
  const wh = new Webhook(WEBHOOK_SECRET);

  let body: { type: string; data: any };
  try {
    body = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: any };
  } catch (err) {
    console.error("[Clerk Webhook] Verification failed:", err instanceof Error ? err.message : "Unknown");
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
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
