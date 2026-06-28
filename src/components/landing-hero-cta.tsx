'use client'

import { SignInButton, SignUpButton } from '@clerk/nextjs'

import { Button } from '@/components/ui/button'

export function LandingHeroCta() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <SignUpButton mode="modal" forceRedirectUrl="/auth/transition">
        <Button className="rounded-xl px-7 py-5 text-base">Get started free</Button>
      </SignUpButton>
      <SignInButton mode="modal" forceRedirectUrl="/auth/transition">
        <Button
          variant="outline"
          className="rounded-xl px-7 py-5 text-base border-[#174f48]/20 bg-white/90 dark:bg-zinc-800 dark:text-white dark:border-zinc-600 dark:hover:bg-zinc-700"
        >
          Sign in
        </Button>
      </SignInButton>
    </div>
  )
}
