import { auth, currentUser } from "@clerk/nextjs/server";

import { upsertUserByClerkUserId } from "@/data/users";

export async function getCurrentAppUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  const clerkUser = await currentUser();

  return upsertUserByClerkUserId({
    clerkUserId,
    displayName: clerkUser?.fullName ?? clerkUser?.username ?? null,
    imageUrl: clerkUser?.imageUrl ?? null,
  });
}