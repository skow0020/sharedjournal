'use client'

import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

export function AuthHeader() {
  const pathname = usePathname()

  if (pathname === '/auth/transition' || pathname === '/auth/sign-out') {
    return null
  }

  return (
    <header className="flex justify-end gap-3 p-4">
      <ThemeToggle />
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/auth/transition">
          <button className="cursor-pointer rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-100">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal" forceRedirectUrl="/auth/transition">
          <button className="cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
            Sign Up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-10 h-10',
            },
          }}
        />
      </Show>
    </header>
  )
}
