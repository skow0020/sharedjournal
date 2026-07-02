type ModerationDecision = 'allow' | 'block' | 'review'
type ModerationFailMode = 'open' | 'closed'
type ModerationLogResult = 'allow' | 'block' | 'error'

type ProviderModerationResult = {
  flagged: boolean
}

export type ModerateContentInput = {
  content: string
  contentType: 'entry' | 'comment'
  actionName: string
  requestId?: string
}

export type ModerateContentResult = {
  decision: ModerationDecision
  reasonCode?: 'policy_violation' | 'provider_error_fail_closed'
}

function isModerationEnabled(): boolean {
  return process.env.CONTENT_MODERATION_ENABLED === 'true'
}

function getModerationFailMode(): ModerationFailMode {
  return process.env.CONTENT_MODERATION_FAIL_MODE === 'closed' ? 'closed' : 'open'
}

function logModerationEvent(input: {
  actionName: string
  contentType: 'entry' | 'comment'
  result: ModerationLogResult
  failMode: ModerationFailMode
  provider: string
  requestId?: string
  decision?: ModerationDecision
  errorMessage?: string
}) {
  const payload = {
    event: 'content_moderation',
    actionName: input.actionName,
    contentType: input.contentType,
    result: input.result,
    failMode: input.failMode,
    provider: input.provider,
    requestId: input.requestId ?? null,
    decision: input.decision ?? null,
    errorMessage: input.errorMessage ?? null,
  }

  if (input.result === 'error') {
    console.warn(payload)
    return
  }

  console.info(payload)
}

async function moderateWithOpenAI(content: string): Promise<ProviderModerationResult> {
  const apiKey = process.env.CONTENT_MODERATION_API_KEY

  if (!apiKey) {
    throw new Error('Missing moderation API key.')
  }

  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'omni-moderation-latest',
      input: content,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Moderation provider error (${response.status}).`)
  }

  const responseBody = (await response.json()) as {
    results?: Array<{
      flagged?: boolean
    }>
  }

  const flagged = responseBody.results?.[0]?.flagged

  if (typeof flagged !== 'boolean') {
    throw new Error('Invalid moderation response payload.')
  }

  return { flagged }
}

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentResult> {
  const failMode = getModerationFailMode()
  const provider = process.env.CONTENT_MODERATION_PROVIDER ?? 'openai'

  if (!isModerationEnabled()) {
    return { decision: 'allow' }
  }

  try {
    const moderationResult =
      provider === 'openai'
        ? await moderateWithOpenAI(input.content)
        : (() => {
            throw new Error(`Unsupported moderation provider: ${provider}`)
          })()

    const decision: ModerationDecision = moderationResult.flagged ? 'block' : 'allow'

    logModerationEvent({
      actionName: input.actionName,
      contentType: input.contentType,
      result: decision === 'allow' ? 'allow' : 'block',
      failMode,
      provider,
      requestId: input.requestId,
      decision,
    })

    if (decision === 'block') {
      return {
        decision,
        reasonCode: 'policy_violation',
      }
    }

    return { decision }
  } catch (error) {
    logModerationEvent({
      actionName: input.actionName,
      contentType: input.contentType,
      result: 'error',
      failMode,
      provider,
      requestId: input.requestId,
      decision: failMode === 'closed' ? 'block' : 'allow',
      errorMessage: error instanceof Error ? error.message : 'Unknown moderation error',
    })

    if (failMode === 'closed') {
      return {
        decision: 'block',
        reasonCode: 'provider_error_fail_closed',
      }
    }

    return { decision: 'allow' }
  }
}
