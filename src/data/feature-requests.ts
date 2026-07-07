import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { featureRequestSurveys } from '@/db/schema'

export type FeatureRequestSurveyStatus = 'submitted' | 'dismissed'

type UpsertFeatureRequestSurveyResponseInput = {
  userId: string
  requestText: string | null
  status: FeatureRequestSurveyStatus
}

export async function upsertFeatureRequestSurveyResponse(
  input: UpsertFeatureRequestSurveyResponseInput,
): Promise<{ id: string }> {
  const [response] = await db
    .insert(featureRequestSurveys)
    .values({
      userId: input.userId,
      requestText: input.requestText,
      status: input.status,
    })
    .onConflictDoUpdate({
      target: featureRequestSurveys.userId,
      set: {
        requestText: input.requestText,
        status: input.status,
        updatedAt: new Date(),
      },
    })
    .returning({ id: featureRequestSurveys.id })

  return response
}

export async function getFeatureRequestSurveyResponseForUser(input: {
  userId: string
}): Promise<{
  id: string
  status: FeatureRequestSurveyStatus
  requestText: string | null
} | null> {
  const [response] = await db
    .select({
      id: featureRequestSurveys.id,
      status: featureRequestSurveys.status,
      requestText: featureRequestSurveys.requestText,
    })
    .from(featureRequestSurveys)
    .where(eq(featureRequestSurveys.userId, input.userId))
    .limit(1)

  return response ?? null
}
