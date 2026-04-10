import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LandingHeroCta } from '@/components/landing-hero-cta'

/*
 * Note: Native mobile apps (Android / iOS) are not yet available.
 * The Google Play and App Store download buttons have been removed
 * until those apps are released.
 */

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/dashboard')
  }

  return (
    <main className="w-full">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-0 h-80 w-80 rounded-full bg-[#74d9c5]/25 blur-3xl" />
          <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-[#ff9a7f]/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl space-y-6 text-center">
          <div className="inline-flex rounded-full border border-[#74d9c5]/60 bg-[#f4fffc] px-3 py-1 text-xs font-medium text-[#1f5f56]">
            Private and collaborative journaling
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Write together.<br className="hidden sm:block" /> Stay connected.
          </h1>
          <p className="mx-auto max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            SharedJournal is a web app for couples, families, and small groups who want to write,
            share memories, and stay in each other&apos;s lives — privately, on their own terms.
          </p>
          <LandingHeroCta />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-[#f8fffd] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
            <p className="text-muted-foreground">Everything in one journal workflow</p>
          </div>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '1', title: 'Create a journal', body: 'Start a personal or shared journal for any topic — travel, family milestones, a project, or everyday life.' },
              { step: '2', title: 'Write entries', body: 'Add written entries whenever you like. Attach photos to capture moments alongside your words.' },
              { step: '3', title: 'Invite trusted people', body: 'Send an invitation link to people you trust. Only invited members can read or write in your shared journal.' },
              { step: '4', title: 'Write together', body: 'Everyone in the journal contributes to a shared timeline. See new entries as they appear.' },
            ].map(({ step, title, body }) => (
              <li key={step} className="flex flex-col gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#74d9c5] bg-[#e9f8f4] text-sm font-semibold text-[#174f48]">
                  {step}
                </span>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-sm leading-6 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for ongoing stories</h2>
            <p className="text-muted-foreground">Not one-off notes — a lasting record of shared life.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
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
            <Card className="border-[#d4e6ff] bg-[#f8fbff]">
              <CardHeader>
                <CardTitle className="text-base">Photo support</CardTitle>
                <CardDescription>Add multiple images to entries and review them in-place.</CardDescription>
              </CardHeader>
            </Card>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['Owner controls', 'Role-based access', 'Invite links', 'Private image serving', 'Clean activity history'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#ffd4c8] bg-[#fff6f3] px-3 py-1 text-sm text-[#7b3f2d]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy & security ── */}
      <section className="bg-[#f4fffc] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl space-y-8 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your journals stay yours</h2>
            <p className="text-muted-foreground">
              Journals hold personal memories. We built SharedJournal with access control at the core,
              not as an afterthought.
            </p>
          </div>
          <ul className="grid gap-4 text-left sm:grid-cols-2">
            {[
              { title: 'Invitation-only access', body: 'No one can join a shared journal without an explicit invitation from the owner.' },
              { title: 'Role-based permissions', body: 'Owners and collaborators have distinct capabilities. You stay in control of your space.' },
              { title: 'Private image serving', body: 'Photos attached to entries are served privately and are not publicly accessible.' },
              { title: 'Clean activity history', body: 'Every change is tracked so you always know what happened and when.' },
            ].map(({ title, body }) => (
              <li key={title} className="rounded-xl border border-[#d9efe9] bg-white/90 px-4 py-4">
                <p className="text-sm font-semibold text-[#174f48]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Common questions</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                q: 'Is SharedJournal free to use?',
                a: 'You can sign up and start journaling for free. Create an account and explore the app at no cost.',
              },
              {
                q: 'Who can see my journals?',
                a: 'Only you — and anyone you explicitly invite. Personal journals are private to you. Shared journals are visible only to the members you invite.',
              },
              {
                q: 'How do I invite someone to a shared journal?',
                a: 'From your journal settings, generate an invite link and send it to the person you want to include. They will be prompted to create an account if they do not have one.',
              },
              {
                q: 'Can I remove someone from a shared journal?',
                a: 'Yes. As the journal owner you can remove any collaborator at any time from the journal settings.',
              },
              {
                q: 'Is there a mobile app?',
                a: 'SharedJournal is a web app that works well on mobile browsers. Native iOS and Android apps are not yet available.',
              },
            ].map(({ q, a }) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left text-sm font-medium">{q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-muted-foreground">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-[#f8fffd] px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-xl space-y-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Start writing together today
          </h2>
          <p className="text-muted-foreground">
            Create your first journal in minutes. No credit card required.
          </p>
          <LandingHeroCta />
        </div>
      </section>
    </main>
  )
}
