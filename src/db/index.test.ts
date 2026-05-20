import { beforeEach, describe, expect, it, vi } from 'vitest'

const { drizzleMock } = vi.hoisted(() => ({
  drizzleMock: vi.fn(() => ({ mocked: true })),
}))

vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: drizzleMock,
}))

describe('db index', () => {
  beforeEach(() => {
    vi.resetModules()
    drizzleMock.mockClear()
    process.env.DATABASE_URL = 'postgres://example.test/db'
  })

  it('creates db client from DATABASE_URL', async () => {
    const mod = await import('@/db')

    expect(drizzleMock).toHaveBeenCalledTimes(1)
    const [databaseUrl, options] = drizzleMock.mock.calls[0] ?? []

    expect(databaseUrl).toBe('postgres://example.test/db')
    expect(options).toMatchObject({
      schema: expect.any(Object),
    })
    expect(options?.schema).toHaveProperty('users')
    expect(mod.db).toEqual({ mocked: true })
  })
})
