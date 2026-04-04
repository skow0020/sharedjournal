import '@testing-library/jest-dom/vitest'
import 'vitest-axe/extend-expect'
import { cleanup } from '@testing-library/react'
import { afterEach, expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

if (!process.env.ENTRY_CONTENT_ENCRYPTION_KEY) {
	process.env.ENTRY_CONTENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
}

afterEach(() => {
	cleanup()
})
