import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Get a user by their Clerk user ID.
 * This is a helper function for database access as per data-fetching.md guidelines.
 */
export async function getUserByClerkUserId(clerkUserId: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return user;
}