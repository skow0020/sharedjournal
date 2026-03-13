import { config } from 'dotenv'

// Load .env.test before any test file imports @/db, so DATABASE_URL is available.
config({ path: '.env.test' })
