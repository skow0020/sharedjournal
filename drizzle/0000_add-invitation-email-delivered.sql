ALTER TABLE "journal_invitations"
ADD COLUMN IF NOT EXISTS "email_delivered" boolean DEFAULT false NOT NULL;