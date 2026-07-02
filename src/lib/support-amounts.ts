export const SUPPORT_AMOUNTS = [500, 1000, 2500] as const

export type SupportAmountCents = (typeof SUPPORT_AMOUNTS)[number]
