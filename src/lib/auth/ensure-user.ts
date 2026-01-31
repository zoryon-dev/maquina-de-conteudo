/**
 * User Synchronization Helper
 *
 * Ensures that the Clerk user exists in the database.
 * This is needed because Clerk doesn't automatically sync users to our database.
 *
 * Handles the case where a user's email already exists in the database
 * with a different Clerk ID (e.g., account was recreated or environment migration).
 *
 * IMPORTANT: When email exists with a different Clerk ID, this function
 * updates the database record to use the new Clerk ID, ensuring consistency
 * across all queries that use auth().userId directly.
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
 * updates the existing record with the new Clerk ID to maintain consistency.
 *
 * @returns The Clerk user ID (always synced with database after this call)
 * @throws Error if user is not authenticated or if sync fails
 */
export async function ensureAuthenticatedUser(): Promise<string> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error('Unauthorized');
  }

  // First, check if user exists by Clerk ID
  const existingById = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, clerkUserId))
    .limit(1);

  if (existingById.length > 0) {
    return clerkUserId;
  }

  console.log(`[Auth] User not found by Clerk ID ${clerkUserId}, checking by email...`);

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

    // Check if email already exists (possibly with different Clerk ID)
    const existingByEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, primaryEmail))
      .limit(1);

    if (existingByEmail.length > 0) {
      const oldUserId = existingByEmail[0].id;

      // Email exists with different Clerk ID - update to new Clerk ID
      // This ensures consistency when auth().userId is used elsewhere
      console.log(
        `[Auth] Email ${primaryEmail} exists with old ID ${oldUserId}, updating to new Clerk ID ${clerkUserId}`
      );

      await db
        .update(users)
        .set({
          id: clerkUserId,
          name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
          avatarUrl: clerkUser.imageUrl || null,
          updatedAt: new Date(),
          deletedAt: null, // Reactivate if soft-deleted
        })
        .where(eq(users.email, primaryEmail));

      console.log(`[Auth] User ID updated from ${oldUserId} to ${clerkUserId}`);
      return clerkUserId;
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

    console.log(`[Auth] Created new user record for Clerk ID ${clerkUserId}`);
    return clerkUserId;
  } catch (error) {
    console.error('[Auth] Failed to sync user:', error);
    throw new Error('Failed to synchronize user. Please try again.');
  }
}
