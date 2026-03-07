import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InvitationPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { token } = await params

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Invitation link</CardTitle>
          <CardDescription>
            Invite token received: <span className="font-mono">{token}</span>. Acceptance flow is being implemented.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  )
}
