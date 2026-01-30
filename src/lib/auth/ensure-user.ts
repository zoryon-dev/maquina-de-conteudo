/**
 * User Synchronization Helper
 *
 * Ensures that the Clerk user exists in the database.
 * This is needed because Clerk doesn't automatically sync users to our database.
 *
 * Handles the case where a user's email already exists in the database
 * with a different Clerk ID (e.g., account was recreated).
 */

import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Ensures the authenticated user exists in the database.
 * Creates the user record if it doesn't exist.
 *
 * If the user's email already exists with a different Clerk ID (account recreated),
 * returns the existing user instead of failing.
 *
 * @returns The user ID (may be different from Clerk ID if email was reused)
 * @throws Error if user is not authenticated or if sync fails
 */
export async function ensureAuthenticatedUser(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  console.log(`[Auth] Clerk userId: ${clerkUserId}`);

  // First, check if user exists by Clerk ID
  const existingById = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, clerkUserId))
    .limit(1);

  if (existingById.length > 0) {
    console.log(`[Auth] User found by Clerk ID: ${clerkUserId}`);
    return clerkUserId;
  }

  console.log(`[Auth] User not found by Clerk ID, checking by email...`);

  // User doesn't exist in DB by Clerk ID. Check if email exists.
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkUserId);
    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error('No email address found for user');
    }

    console.log(`[Auth] User email: ${primaryEmail}`);

    // Check if email already exists (possibly with different Clerk ID)
    const existingByEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, primaryEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      // Email already exists with different Clerk ID
      // This happens when user recreated their Clerk account
      // Return the existing user ID instead of creating a duplicate
      console.log(`[Auth] Email ${primaryEmail} already exists with DB ID ${existingByEmail[0].id}, Clerk ID is ${clerkUserId} - REUSING DB ID`);
      return existingByEmail[0].id;
    }

    // Create new user record
    await db.insert(users).values({
      id: clerkUser.id,
      email: primaryEmail,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      avatarUrl: clerkUser.imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Auth] Created new user record for Clerk ID ${clerkUserId}, email ${primaryEmail}`);
    return clerkUserId;
  } catch (error) {
    console.error('[Auth] Failed to sync user:', error);
    throw new Error('Failed to synchronize user. Please try again.');
  }
}
