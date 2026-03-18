import { config } from 'dotenv'

// Load .env.test before any test file imports @/db, so DATABASE_URL is available.
config({ path: '.env.test' })

if (!process.env.ENTRY_CONTENT_ENCRYPTION_KEY) {
	process.env.ENTRY_CONTENT_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
}
