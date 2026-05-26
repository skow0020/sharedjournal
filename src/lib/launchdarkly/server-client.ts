import {
  init,
  type LDClient,
  type LDContext,
} from '@launchdarkly/node-server-sdk'

let launchDarklyClient: LDClient | null = null
let launchDarklyInitialization: Promise<LDClient> | null = null
const LAUNCHDARKLY_INITIALIZATION_TIMEOUT_SECONDS = 10

function getLaunchDarklySdkKey(): string {
  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY

  if (!sdkKey) {
    throw new Error('LAUNCHDARKLY_SDK_KEY is not configured.')
  }

  return sdkKey
}

export async function getLaunchDarklyServerClient(): Promise<LDClient> {
  if (launchDarklyClient) {
    return launchDarklyClient
  }

  if (launchDarklyInitialization) {
    return launchDarklyInitialization
  }

  const client = init(getLaunchDarklySdkKey())

  launchDarklyInitialization = client.waitForInitialization({
    timeout: LAUNCHDARKLY_INITIALIZATION_TIMEOUT_SECONDS,
  })
    .then(() => {
      launchDarklyClient = client
      return client
    })
    .catch((error) => {
      launchDarklyInitialization = null
      throw error
    })

  return launchDarklyInitialization
}

export function createLaunchDarklyContext(input: {
  key: string
  email?: string | null
  name?: string | null
  anonymous?: boolean
}): LDContext {
  return {
    kind: 'user',
    key: input.key,
    ...(input.email ? { email: input.email } : {}),
    ...(input.name ? { name: input.name } : {}),
    ...(input.anonymous ? { anonymous: true } : {}),
  }
}

export async function getLaunchDarklyVariation<T>(params: {
  flagKey: string
  context: LDContext
  fallback: T
}): Promise<T> {
  const client = await getLaunchDarklyServerClient()

  return client.variation(params.flagKey, params.context, params.fallback)
}