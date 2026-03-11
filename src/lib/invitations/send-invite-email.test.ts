import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendInviteEmail } from '@/lib/invitations/send-invite-email'

const originalEnv = {
  INVITE_EMAIL_PROVIDER: process.env.INVITE_EMAIL_PROVIDER,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
}

describe('sendInviteEmail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete process.env.INVITE_EMAIL_PROVIDER
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
  })

  afterEach(() => {
    if (originalEnv.INVITE_EMAIL_PROVIDER === undefined) {
      delete process.env.INVITE_EMAIL_PROVIDER
    } else {
      process.env.INVITE_EMAIL_PROVIDER = originalEnv.INVITE_EMAIL_PROVIDER
    }

    if (originalEnv.RESEND_API_KEY === undefined) {
      delete process.env.RESEND_API_KEY
    } else {
      process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY
    }

    if (originalEnv.RESEND_FROM_EMAIL === undefined) {
      delete process.env.RESEND_FROM_EMAIL
    } else {
      process.env.RESEND_FROM_EMAIL = originalEnv.RESEND_FROM_EMAIL
    }
  })

  it('returns none provider when invite email provider is not configured', async () => {
    const result = await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Test Journal',
      inviterName: 'Inviter',
    })

    expect(result).toEqual({
      delivered: false,
      provider: 'none',
      message: 'Invite email provider is not configured.',
    })
  })

  it('returns resend error when resend provider is configured without required credentials', async () => {
    process.env.INVITE_EMAIL_PROVIDER = 'resend'

    const result = await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Test Journal',
      inviterName: 'Inviter',
    })

    expect(result).toEqual({
      delivered: false,
      provider: 'resend',
      message: 'Missing RESEND_API_KEY or RESEND_FROM_EMAIL.',
    })
  })

  it('returns resend failure details when resend responds with non-2xx', async () => {
    process.env.INVITE_EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('unauthorized'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Test Journal',
      inviterName: 'Inviter',
    })

    expect(result).toEqual({
      delivered: false,
      provider: 'resend',
      message: 'Resend API request failed (401): unauthorized',
    })
  })

  it('sends via resend and returns delivered true on success', async () => {
    process.env.INVITE_EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Team Journal',
      inviterName: 'Pat',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-api-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@example.com',
        to: ['invitee@example.com'],
        subject: 'You are invited to join Team Journal',
        text: 'Pat invited you to join "Team Journal" on SharedJournal.\n\nAccept invitation: https://example.com/invitations/token',
      }),
      cache: 'no-store',
    })

    expect(result).toEqual({
      delivered: true,
      provider: 'resend',
      message: 'Invitation email sent via Resend.',
    })
  })

  it('uses fallback inviter name when inviterName is null', async () => {
    process.env.INVITE_EMAIL_PROVIDER = 'resend'
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Team Journal',
      inviterName: null,
    })

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(payload.text).toContain('A SharedJournal member invited you to join "Team Journal"')
  })

  it('treats invite provider as case-insensitive', async () => {
    process.env.INVITE_EMAIL_PROVIDER = 'ReSeNd'
    process.env.RESEND_API_KEY = 'test-api-key'
    process.env.RESEND_FROM_EMAIL = 'noreply@example.com'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendInviteEmail({
      toEmail: 'invitee@example.com',
      inviteLink: 'https://example.com/invitations/token',
      journalTitle: 'Case Journal',
      inviterName: 'Inviter',
    })

    expect(result.provider).toBe('resend')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
