# SharedJournal

A Next.js journal application built with the App Router, featuring user authentication and database integration.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Setup

### Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Neon/PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/database

# Entry content encryption (base64-encoded 32-byte key)
ENTRY_CONTENT_ENCRYPTION_KEY=replace-with-openssl-rand-base64-32

# App URL (used in invite links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Invite Email Provider (optional)
# Resend is auto-detected when RESEND_API_KEY and RESEND_FROM_EMAIL are set.
# Optionally set INVITE_EMAIL_PROVIDER=resend explicitly, or INVITE_EMAIL_PROVIDER=none to disable email sending.
INVITE_EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=SharedJournal <invites@notify.sharedjournal.app>

# Datadog monitoring (optional — all Datadog vars are optional; monitoring is disabled when absent)
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=pub...
NEXT_PUBLIC_DATADOG_APPLICATION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DD_API_KEY=...
```

### Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com/)
2. Get your API keys from the [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
3. Add your keys to `.env.local`

### Database Setup

1. Create a Neon account at [neon.tech](https://neon.tech/)
2. Create a new project and copy your connection string
3. Add the `DATABASE_URL` to `.env.local`
4. Generate an entry encryption key, for example with `openssl rand -base64 32`, and add it as `ENTRY_CONTENT_ENCRYPTION_KEY`
5. Seed sample data (optional):

```bash
npm run db:seed
```

6. Run schema migrations when pulling DB changes:

```bash
npm run db:migrate
```

### Migration Basics (Drizzle)

Use this simple workflow for database changes:

1. Update schema in `src/db/schema.ts`.
2. Generate a migration file:

```bash
npm run db:generate
```

3. Commit the new files under `drizzle/`.
4. Apply pending migrations:

```bash
npm run db:migrate
```

Notes:

- Drizzle tracks applied migrations in the database and only runs new ones.
- Do not edit a migration that has already been applied; create a new migration instead.

### Invite Email Provider (Resend)

1. Create a [Resend](https://resend.com/) account.
2. Verify a sending domain in Resend (required for production).
3. Create an API key in Resend.
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` to `.env.local`.
5. Optionally set `INVITE_EMAIL_PROVIDER=resend` explicitly, or `INVITE_EMAIL_PROVIDER=none` to disable invite email sending.
6. Set `NEXT_PUBLIC_APP_URL` (or `APP_URL`) to your app origin for deterministic invite links across environments.

If invite email env vars are missing, invitations are still created and the UI shows the invite link for manual sharing.

### Vercel Domain Provider for Invites

This project uses Vercel as the DNS provider for `sharedjournal.app` and Resend for email delivery.

Use this exact domain alignment for invites:

- App domain: `sharedjournal.app`
- Email sending subdomain in Resend: `notify.sharedjournal.app`
- From address: `SharedJournal <invites@notify.sharedjournal.app>`

In Vercel DNS, add the records provided by Resend for `notify.sharedjournal.app`. Typical records are:

- DKIM: `TXT` at `resend._domainkey.notify` with the `p=...` key from Resend
- SPF: `TXT` at `send.notify` with `v=spf1 include:amazonses.com ~all`
- MAIL FROM: `MX` at `send.notify` with `feedback-smtp.us-east-1.amazonses.com`
- DMARC: `TXT` at `_dmarc.notify` with `v=DMARC1; p=none;`

Important notes:

- The domain in Resend, DNS records in Vercel, and `RESEND_FROM_EMAIL` must all match the same `.app` domain family.
- In development, keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` (or set `APP_URL` similarly).
- In production, set `NEXT_PUBLIC_APP_URL=https://sharedjournal.app` (or `APP_URL=https://sharedjournal.app`) so invite links in emails always point to your canonical domain.

### Journal Invite Link Behavior

- When an owner invites a user, SharedJournal creates a tokenized link at `/invitations/[token]`.
- Invite links are generated from this base URL resolution order:
  1. `NEXT_PUBLIC_APP_URL`
  2. `APP_URL`
  3. Request `origin` header
  4. Request host headers (`x-forwarded-host`, then `host`) with protocol from `x-forwarded-proto` (or inferred as `http` for localhost, `https` otherwise)
  5. Vercel env (`VERCEL_PROJECT_PRODUCTION_URL`, then `VERCEL_URL`)
  6. Final fallback: `https://sharedjournal.app` in production, `http://localhost:3000` otherwise
- If Resend credentials are configured and delivery succeeds, the invite is sent via Resend.
- If email is not configured or fails, the invite record is still created and the UI shows the invite link for manual sharing.

### Implementation Details

- **Middleware**: `src/proxy.ts` uses `clerkMiddleware()` from `@clerk/nextjs/server`
- **Provider**: The app is wrapped with `<ClerkProvider>` in `src/app/layout.tsx`
- **Components**: Uses `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, and `<SignedOut>` for auth UI
- **Database**: Uses Drizzle ORM with Neon PostgreSQL for data persistence

### Documentation

- [Clerk Next.js Quickstart](https://clerk.com/docs/nextjs/getting-started/quickstart)
- [Clerk Documentation](https://clerk.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Neon Documentation](https://neon.tech/docs)

## Datadog Monitoring

SharedJournal integrates [Datadog](https://www.datadoghq.com/) for frontend and backend observability including Real User Monitoring (RUM), browser logs, and distributed tracing.

### Environment Variables

Add the following variables to your `.env.local` (frontend variables are optional — monitoring is silently disabled when they are absent):

```bash
# Datadog Browser RUM & Logs (frontend — optional)
NEXT_PUBLIC_DATADOG_CLIENT_TOKEN=pub...
NEXT_PUBLIC_DATADOG_APPLICATION_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_DATADOG_SITE=datadoghq.com          # default: datadoghq.com
NEXT_PUBLIC_DATADOG_SERVICE=sharedjournal-web   # default: sharedjournal-web
NEXT_PUBLIC_DATADOG_ENV=production              # default: NODE_ENV
NEXT_PUBLIC_DATADOG_VERSION=1.0.0              # optional

# Datadog APM / Server-side tracing (backend — optional)
# Set DD_API_KEY or DD_AGENT_HOST to enable server-side tracing.
DD_API_KEY=...                 # Datadog API key (if using agentless intake)
DD_AGENT_HOST=localhost        # Datadog Agent host (if running the Agent)
DD_SERVICE=sharedjournal       # default: sharedjournal
DD_ENV=production              # default: NODE_ENV
DD_VERSION=1.0.0               # optional
```

### Setup

1. Create a [Datadog](https://www.datadoghq.com/) account (free trial available).
2. In the Datadog UI navigate to **UX Monitoring → Real User Monitoring → New Application** to get your `NEXT_PUBLIC_DATADOG_APPLICATION_ID` and `NEXT_PUBLIC_DATADOG_CLIENT_TOKEN`.
3. Add all desired variables to `.env.local` (never commit secrets to the repository).
4. For server-side APM either:
   - Install the [Datadog Agent](https://docs.datadoghq.com/agent/) on your host and set `DD_AGENT_HOST`, **or**
   - Set `DD_API_KEY` for agentless HTTP intake.

### How It Works

- **Frontend** (`src/components/datadog-init.tsx`): A `'use client'` React component initialised in the root layout. It calls `datadogRum.init()` and `datadogLogs.init()` on first mount. Both use `beforeSend` callbacks to redact email addresses and sensitive context keys (`content`, `password`, `token`, `secret`, `key`, `email`, `authorization`) before any data leaves the browser.
- **Backend** (`instrumentation.ts`): Uses the Next.js [Instrumentation API](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation) to import `dd-trace` at server startup (Node.js runtime only). The tracer is only activated when `DD_API_KEY` or `DD_AGENT_HOST` is present so there is no performance overhead in environments without Datadog configured.
- **Privacy**: `defaultPrivacyLevel: 'mask-user-input'` is set for RUM so all form inputs are masked in session recordings by default.

### References

- [Datadog Browser Logs](https://docs.datadoghq.com/logs/log_collection/javascript/)
- [Datadog Real User Monitoring](https://docs.datadoghq.com/real_user_monitoring/browser/)
- [Datadog Node.js APM (dd-trace)](https://docs.datadoghq.com/tracing/trace_collection/dd_libraries/nodejs/)
- [Security & Data Redaction in Datadog](https://docs.datadoghq.com/logs/log_collection/security/)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Ollama Integration

This project can be used with Ollama for local AI development assistance.

### What is Ollama?

Ollama is a platform that allows you to run large language models locally on your machine. It provides an easy way to interact with various AI models without relying on cloud services.

### Launch Claude via Ollama

```bash
ollama claude --model Qwen2.5-Coder:7b
```

Or use the default Claude model:

```bash
ollama launch claude
```


### Installing Neon MCP Server

The Neon Model Context Protocol (MCP) server allows you to interact with your Neon PostgreSQL databases using natural language through AI assistants like Claude Code.

#### Quick Setup (Recommended)

Run the automated setup command:

```bash
npx neonctl@latest init
```

This will:
- Authenticate via OAuth
- Create a Neon API key automatically
- Configure your MCP client (Claude Code, VS Code, Cursor)

#### Manual Setup with Ollama

1. **Configure Claude Code MCP servers**:
   ```bash
   ollama launch claude --config
   ```
   This will open an interactive configuration menu.

2. **Add Neon MCP to your MCP configuration**:
   
   After configuring Ollama, you'll need to add Neon to your MCP servers configuration file. The easiest way is using the remote hosted server:
   
   ```bash
   npx add-mcp https://mcp.neon.tech/mcp
   ```

3. **Alternative: Manual MCP Configuration**:
   
   Create or edit your MCP configuration file (location varies by tool):
   
   **Remote MCP Server (OAuth - No API Key Needed)**:
   ```json
   {
     "mcpServers": {
       "Neon": {
         "type": "http",
         "url": "https://mcp.neon.tech/mcp"
       }
     }
   }
   ```

#### Using Neon MCP

Once configured, you can use natural language commands like:
- "Create a new Postgres database called 'my-database'"
- "Show me all my Neon projects"
- "Run a migration on my project to add a created_at column"

### Documentation

For more information, visit:
- [Neon MCP Server Guide](https://neon.tech/docs/ai/neon-mcp-server)
- [Neon MCP GitHub](https://github.com/neondatabase/mcp-server-neon)
- [Ollama Documentation](https://docs.ollama.com)
- [Model Context Protocol](https://modelcontextprotocol.io)

### Note:
Created with the help of this udemy course: [Course](https://sdg.udemy.com/course/learn-claude-code/learn/lecture/54834735#overview)