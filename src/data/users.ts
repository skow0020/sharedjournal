import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

type UpsertClerkUserInput = {
  clerkUserId: string;
  displayName?: string | null;
  imageUrl?: string | null;
};

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

export async function upsertUserByClerkUserId({
  clerkUserId,
  displayName,
  imageUrl,
}: UpsertClerkUserInput) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId,
      displayName: displayName ?? null,
      imageUrl: imageUrl ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        displayName: displayName ?? null,
        imageUrl: imageUrl ?? null,
      },
    })
    .returning({ id: users.id });

  return user;
}