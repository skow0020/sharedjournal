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

export default function AuthTransitionPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (isSignedIn) {
      router.replace('/dashboard')
      return
    }

    router.replace('/')
  }, [isLoaded, isSignedIn, router])

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-4xl items-center justify-center px-6 py-8">
      <Card className="w-full max-w-md border-[#d9efe9] bg-white/95 shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl">Signing you in</CardTitle>
          <CardDescription>Preparing your journal dashboard...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center pb-8">
          <LoaderCircleIcon className="h-8 w-8 animate-spin text-[#174f48]" aria-hidden="true" />
          <span className="sr-only">Completing sign-in and redirecting to dashboard</span>
        </CardContent>
      </Card>
    </main>
  )
}
