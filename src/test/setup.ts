import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (!process.env.ENTRY_CONTENT_ENCRYPTION_KEY) {
	process.env.ENTRY_CONTENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
}

afterEach(() => {
	cleanup()
})
