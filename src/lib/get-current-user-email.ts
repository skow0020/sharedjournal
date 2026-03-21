import { currentUser } from '@clerk/nextjs/server'
import { normalizeEmail } from '@/lib/normalize-email'

export async function getCurrentUserEmail(): Promise<string | null> {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return null
  }

  const primaryEmailId = clerkUser.primaryEmailAddressId
  const primaryEmail =
    clerkUser.emailAddresses.find((address) => address.id === primaryEmailId)
    ?? clerkUser.emailAddresses[0]

  if (!primaryEmail?.emailAddress) {
    return null
  }

  return normalizeEmail(primaryEmail.emailAddress)
}
