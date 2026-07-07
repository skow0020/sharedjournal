import { eq, sql } from 'drizzle-orm'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { featureRequestSurveys, users } from '@/db/schema'
import {
  getFeatureRequestSurveyResponseForUser,
  upsertFeatureRequestSurveyResponse,
} from '@/data/feature-requests'

async function createUser(overrides?: { clerkUserId?: string }) {
  const [user] = await db
    .insert(users)
    .values({
      clerkUserId: overrides?.clerkUserId ?? `feature_req_${crypto.randomUUID()}`,
      displayName: 'Feature Request User',
    })
    .returning({ id: users.id })

  return user
}

async function deleteUsers(ids: string[]) {
  const uniqueIds = [...new Set(ids)]

  for (const id of uniqueIds) {
    await db.delete(users).where(eq(users.id, id))
  }
}

describe('feature request survey data helpers', () => {
  const createdUserIds: string[] = []

  beforeAll(async () => {
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_request_survey_status') THEN
          CREATE TYPE feature_request_survey_status AS ENUM ('submitted', 'dismissed');
        END IF;
      END
      $$;
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feature_request_surveys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        request_text text,
        status feature_request_survey_status NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `)

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS feature_request_surveys_user_uidx
      ON feature_request_surveys (user_id);
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS feature_request_surveys_status_idx
      ON feature_request_surveys (status);
    `)
  })

  beforeEach(() => {
    createdUserIds.length = 0
  })

  afterEach(async () => {
    await deleteUsers(createdUserIds)
  })

  it('creates a submitted response for a user', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const result = await upsertFeatureRequestSurveyResponse({
      userId: user.id,
      requestText: 'Add weekly digest summaries',
      status: 'submitted',
    })

    const [row] = await db
      .select({
        id: featureRequestSurveys.id,
        requestText: featureRequestSurveys.requestText,
        status: featureRequestSurveys.status,
      })
      .from(featureRequestSurveys)
      .where(eq(featureRequestSurveys.id, result.id))

    expect(row.id).toBe(result.id)
    expect(row.requestText).toBe('Add weekly digest summaries')
    expect(row.status).toBe('submitted')
  })

  it('updates existing response when user changes from submitted to dismissed', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await upsertFeatureRequestSurveyResponse({
      userId: user.id,
      requestText: 'Add templates',
      status: 'submitted',
    })

    const updated = await upsertFeatureRequestSurveyResponse({
      userId: user.id,
      requestText: null,
      status: 'dismissed',
    })

    const rows = await db
      .select({
        id: featureRequestSurveys.id,
        requestText: featureRequestSurveys.requestText,
        status: featureRequestSurveys.status,
      })
      .from(featureRequestSurveys)
      .where(eq(featureRequestSurveys.userId, user.id))

    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(updated.id)
    expect(rows[0]?.requestText).toBeNull()
    expect(rows[0]?.status).toBe('dismissed')
  })

  it('returns only the requesting user response', async () => {
    const user = await createUser()
    const otherUser = await createUser()
    createdUserIds.push(user.id, otherUser.id)

    await upsertFeatureRequestSurveyResponse({
      userId: user.id,
      requestText: 'Main user request',
      status: 'submitted',
    })

    await upsertFeatureRequestSurveyResponse({
      userId: otherUser.id,
      requestText: 'Other user request',
      status: 'submitted',
    })

    const result = await getFeatureRequestSurveyResponseForUser({
      userId: user.id,
    })

    expect(result).toEqual({
      id: expect.any(String),
      requestText: 'Main user request',
      status: 'submitted',
    })
  })

  it('returns null when user has not responded', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const result = await getFeatureRequestSurveyResponseForUser({
      userId: user.id,
    })

    expect(result).toBeNull()
  })
})
