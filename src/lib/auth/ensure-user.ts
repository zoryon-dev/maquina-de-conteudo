/**
 * User Synchronization Helper
 *
 * Ensures that the Clerk user exists in the database.
 * This is needed because Clerk doesn't automatically sync users to our database.
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
 * Use this at the beginning of any API route that needs to access the database.
 *
 * @returns The user ID
 * @throws Error if user is not authenticated or if sync fails
 */
export async function ensureAuthenticatedUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Check if user exists in database
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing.length > 0) {
    return userId;
  }

  // User doesn't exist in DB, create from Clerk
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error('No email address found for user');
    }

    await db.insert(users).values({
      id: clerkUser.id,
      email: primaryEmail,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      avatarUrl: clerkUser.imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Auth] Synced user ${userId} to database`);
    return userId;
  } catch (error) {
    console.error('[Auth] Failed to sync user:', error);
    throw new Error('Failed to synchronize user. Please try again.');
  }
}
