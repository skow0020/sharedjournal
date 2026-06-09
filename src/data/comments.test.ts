import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  decryptEntryContentMock,
  encryptEntryContentMock,
  insertMock,
  returningMock,
  selectLimitMock,
  selectMock,
} = vi.hoisted(() => {
  const selectLimitMock = vi.fn()
  const selectChain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    limit: selectLimitMock,
  }
  selectChain.from.mockReturnValue(selectChain)
  selectChain.innerJoin.mockReturnValue(selectChain)
  selectChain.where.mockReturnValue(selectChain)

  const returningMock = vi.fn()
  const valuesMock = vi.fn()
  const insertChain = {
    values: valuesMock,
    returning: returningMock,
  }
  valuesMock.mockReturnValue(insertChain)

  const selectMock = vi.fn().mockReturnValue(selectChain)
  const insertMock = vi.fn().mockReturnValue(insertChain)

  return {
    decryptEntryContentMock: vi.fn(),
    encryptEntryContentMock: vi.fn(),
    insertMock,
    returningMock,
    selectLimitMock,
    selectMock,
  }
})

vi.mock('@/db', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}))

vi.mock('@/lib/entry-content-crypto', () => ({
  decryptEntryContent: decryptEntryContentMock,
  encryptEntryContent: encryptEntryContentMock,
}))

import { canUserCommentOnEntry, createEntryComment } from '@/data/comments'

describe('canUserCommentOnEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectLimitMock.mockResolvedValue([{ id: 'entry-id' }])
  })

  it('returns true when the user can comment on the entry', async () => {
    const result = await canUserCommentOnEntry({
      entryId: '11111111-1111-4111-8111-111111111111',
      journalId: '33333333-3333-4333-8333-333333333333',
      userId: '22222222-2222-4222-8222-222222222222',
    })

    expect(result).toBe(true)
  })

  it('returns false when the user cannot comment on the entry', async () => {
    selectLimitMock.mockResolvedValue([])

    const result = await canUserCommentOnEntry({
      entryId: '11111111-1111-4111-8111-111111111111',
      journalId: '33333333-3333-4333-8333-333333333333',
      userId: '22222222-2222-4222-8222-222222222222',
    })

    expect(result).toBe(false)
  })
})

describe('createEntryComment', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    selectLimitMock.mockResolvedValue([{ id: 'entry-id' }])
    encryptEntryContentMock.mockReturnValue('encrypted-payload')
    decryptEntryContentMock.mockReturnValue('decrypted comment')
    returningMock.mockResolvedValue([
      {
        id: 'comment-id',
        entryId: 'entry-id',
        authorUserId: 'author-id',
        content: 'encrypted-payload',
      },
    ])
  })

  it('returns null when insert returning has no rows', async () => {
    returningMock.mockResolvedValue([])

    const result = await createEntryComment({
      entryId: '11111111-1111-4111-8111-111111111111',
      authorUserId: '22222222-2222-4222-8222-222222222222',
      content: 'Hello',
    })

    expect(result).toBeNull()
    expect(decryptEntryContentMock).not.toHaveBeenCalled()
  })
})
