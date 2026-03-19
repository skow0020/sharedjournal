'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { LoaderCircleIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function SignOutTransitionPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn) {
      router.replace('/')
      return
    }

    router.replace('/dashboard')
  }, [isLoaded, isSignedIn, router])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-8">
      <Card className="w-full max-w-md border-[#d9efe9] bg-white/95 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl">Signing you out</CardTitle>
          <CardDescription>Closing your session and returning home...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center pb-8">
          <LoaderCircleIcon className="h-8 w-8 animate-spin text-[#174f48]" aria-hidden="true" />
          <span className="sr-only">Completing sign-out and redirecting to home page</span>
        </CardContent>
      </Card>
    </main>
  )
}
