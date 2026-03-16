import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  Button,
} from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function GooglePlayLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path fill="#00C853" d="M3.33 2.01 13.9 12.6 3.33 22.99a1.86 1.86 0 0 1-.33-1.12V3.13c0-.41.12-.8.33-1.12Z" />
      <path fill="#FFAB00" d="m16.17 14.86-2.27-2.26 2.27-2.27 2.96 1.68c1.17.66 1.17 1.6 0 2.26l-2.96 1.59Z" />
      <path fill="#FF3D00" d="M16.17 14.86 5.38 21.05c-.88.5-1.61.27-2.05-.32L13.9 12.6l2.27 2.26Z" />
      <path fill="#00B0FF" d="M16.17 10.33 13.9 12.6 3.33 4.25c.44-.59 1.17-.82 2.05-.32l10.79 6.4Z" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M16.71 12.66c.02 2.18 1.91 2.91 1.93 2.92-.02.06-.3 1.03-.99 2.05-.59.88-1.2 1.76-2.16 1.78-.94.02-1.24-.56-2.32-.56-1.09 0-1.42.54-2.3.58-.92.03-1.62-.92-2.22-1.79-1.22-1.77-2.16-5-0.9-7.2.63-1.1 1.75-1.8 2.96-1.81.92-.02 1.8.62 2.32.62.52 0 1.49-.77 2.52-.66.43.02 1.64.17 2.41 1.29-.06.04-1.44.84-1.43 2.78Zm-1.4-5.33c.49-.59.82-1.4.73-2.22-.71.03-1.58.47-2.09 1.06-.46.53-.86 1.35-.75 2.14.79.06 1.61-.4 2.11-.98Z" />
    </svg>
  )
}

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="relative mx-auto min-h-[calc(100vh-72px)] w-full max-w-6xl overflow-hidden px-6 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 right-10 h-64 w-64 rounded-full bg-[#74d9c5]/30 blur-3xl" />
        <div className="absolute bottom-12 -left-20 h-72 w-72 rounded-full bg-[#ff9a7f]/30 blur-3xl" />
      </div>

      <div className="relative grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="inline-flex rounded-full border border-[#74d9c5]/60 bg-[#f4fffc] px-3 py-1 text-xs font-medium text-[#1f5f56]">
            Private and collaborative journaling
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">SharedJournal</h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Write personal entries, collaborate in shared journals, and keep everyone aligned with invitation-based
              access. SharedJournal is built for ongoing stories, not one-off notes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="h-12 rounded-xl border-[#174f48]/20 bg-white/90 px-4">
              <a href="#" aria-label="Download SharedJournal on Google Play (placeholder)">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#e9f8f4] text-[#174f48]">
                  <GooglePlayLogo />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-[10px] text-muted-foreground">Get it on</span>
                  <span className="block text-sm font-semibold">Google Play</span>
                </span>
              </a>
            </Button>
            <Button asChild variant="outline" className="h-12 rounded-xl border-[#174f48]/20 bg-white/90 px-4">
              <a href="#" aria-label="Download SharedJournal on the App Store (placeholder)">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fff1ec] text-[#7b3f2d]">
                  <AppleLogo />
                </span>
                <span className="text-left leading-tight">
                  <span className="block text-[10px] text-muted-foreground">Download on the</span>
                  <span className="block text-sm font-semibold">App Store</span>
                </span>
              </a>
            </Button>
          </div>

          <Card className="border-[#d9efe9] bg-white/90 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Everything in one journal workflow</CardTitle>
              <CardDescription>Create journals, add entries, upload photos, and share with trusted people.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['Create journal', 'Add entries', 'Upload photos', 'Invite collaborators'].map((step) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-[#d9efe9] bg-[#f7fffd] px-2 py-3 text-center text-xs font-medium sm:text-sm"
                  >
                    {step}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 text-sm">
                {['Owner controls', 'Role-based access', 'Invite links', 'Private image serving', 'Clean activity history'].map((capability) => (
                  <span
                    key={capability}
                    className="rounded-full border border-[#ffd4c8] bg-[#fff6f3] px-3 py-1 text-[#7b3f2d]"
                  >
                    {capability}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 sm:grid-cols-3">
            <Card className="border-[#d9efe9] bg-[#f8fffd]">
              <CardHeader>
                <CardTitle className="text-base">Personal journals</CardTitle>
                <CardDescription>Keep private writing spaces organized by topic and date.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-[#ffd9cf] bg-[#fff8f5]">
              <CardHeader>
                <CardTitle className="text-base">Shared entries</CardTitle>
                <CardDescription>Collaborate with invited members in a single timeline.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-[#d4e6ff] bg-[#f5f9ff]">
              <CardHeader>
                <CardTitle className="text-base">Photo support</CardTitle>
                <CardDescription>Add multiple images to entries and review them in-place.</CardDescription>
              </CardHeader>
            </Card>
          </section>
        </section>

        <section>
          <Card className="mx-auto w-full max-w-sm border-[#d9efe9] bg-white/95 shadow-lg">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">SharedJournal at a glance</CardTitle>
              <CardDescription>Designed for private reflection and trusted collaboration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-[#d9efe9] bg-[#f3fffb] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[#1f5f56]">Core flow</p>
                <p className="mt-1 text-2xl font-semibold text-[#174f48]">Journal to entry to invite</p>
              </div>

              <div className="space-y-3">
                {[
                  ['Access control', 'Only journal members can read and write within shared spaces.'],
                  ['Invitation lifecycle', 'Send invite links and track pending, accepted, or declined responses.'],
                  ['Media attachments', 'Upload and review entry photos from the journal detail page.'],
                ].map(([label, note]) => (
                  <article key={label} className="rounded-xl border border-border bg-background px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{note}</p>
                  </article>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
