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

# App URL (used in invite links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Invite Email Provider (optional)
# Set to 'resend' to enable real invite emails, otherwise leave unset.
INVITE_EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=SharedJournal <invites@notify.sharedjournal.app>
```

### Clerk Authentication

1. Create a Clerk account at [clerk.com](https://clerk.com/)
2. Get your API keys from the [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
3. Add your keys to `.env.local`

### Database Setup

1. Create a Neon account at [neon.tech](https://neon.tech/)
2. Create a new project and copy your connection string
3. Add the `DATABASE_URL` to `.env.local`
4. Seed sample data (optional):

```bash
npm run db:seed
```

### Invite Email Provider (Resend)

1. Create a [Resend](https://resend.com/) account.
2. Verify a sending domain in Resend (required for production).
3. Create an API key in Resend.
4. Add `INVITE_EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` to `.env.local`.
5. Set `NEXT_PUBLIC_APP_URL` to your app origin so invite links are correct.

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

- Do not create `A` records for Resend verification records.
- The domain in Resend, DNS records in Vercel, and `RESEND_FROM_EMAIL` must all match the same `.app` domain family.
- In development, keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- In production, set `NEXT_PUBLIC_APP_URL=https://sharedjournal.app` so invite links in emails point to your live app.

### Journal Invite Link Behavior

- When an owner invites a user, SharedJournal creates a tokenized link at `/invitations/[token]`.
- Invite links are generated from `NEXT_PUBLIC_APP_URL`.
- If email delivery is configured and successful, the invite is sent via Resend.
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