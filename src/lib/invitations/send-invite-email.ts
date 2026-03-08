type InviteEmailProvider = 'resend' | 'none'

type SendInviteEmailInput = {
  toEmail: string
  inviteLink: string
  journalTitle: string
  inviterName: string | null
}

type SendInviteEmailResult = {
  delivered: boolean
  provider: InviteEmailProvider
  message: string
}

function getInviteEmailProvider(): InviteEmailProvider {
  const configuredProvider = process.env.INVITE_EMAIL_PROVIDER?.toLowerCase()

  if (configuredProvider === 'resend') {
    return 'resend'
  }

  return 'none'
}

async function sendWithResend({
  toEmail,
  inviteLink,
  journalTitle,
  inviterName,
}: SendInviteEmailInput): Promise<SendInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !fromEmail) {
    return {
      delivered: false,
      provider: 'resend',
      message: 'Missing RESEND_API_KEY or RESEND_FROM_EMAIL.',
    }
  }

  const inviter = inviterName || 'A SharedJournal member'

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `You are invited to join ${journalTitle}`,
      text: `${inviter} invited you to join "${journalTitle}" on SharedJournal.\n\nAccept invitation: ${inviteLink}`,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorBody = await response.text()

    return {
      delivered: false,
      provider: 'resend',
      message: `Resend API request failed (${response.status}): ${errorBody}`,
    }
  }

  return {
    delivered: true,
    provider: 'resend',
    message: 'Invitation email sent via Resend.',
  }
}

export async function sendInviteEmail(
  input: SendInviteEmailInput,
): Promise<SendInviteEmailResult> {
  const provider = getInviteEmailProvider()

  if (provider === 'resend') {
    return sendWithResend(input)
  }

  return {
    delivered: false,
    provider: 'none',
    message: 'Invite email provider is not configured.',
  }
}
