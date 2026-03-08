import { relations, sql } from 'drizzle-orm'
import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core'

export const journalRoleEnum = pgEnum('journal_role', ['owner', 'editor', 'viewer'])

export const invitationStatusEnum = pgEnum('invitation_status', [
	'pending',
	'accepted',
	'declined',
	'revoked',
	'expired',
])

export const users = pgTable(
	'users',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		clerkUserId: text('clerk_user_id').notNull(),
		displayName: varchar('display_name', { length: 120 }),
		imageUrl: text('image_url'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [uniqueIndex('users_clerk_user_id_uidx').on(table.clerkUserId)],
)

export const journals = pgTable(
	'journals',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		title: varchar('title', { length: 180 }).notNull(),
		description: text('description'),
		ownerUserId: uuid('owner_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdateFn(() => new Date()),
	},
	(table) => [index('journals_owner_user_id_idx').on(table.ownerUserId)],
)

export const journalMembers = pgTable(
	'journal_members',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		journalId: uuid('journal_id')
			.notNull()
			.references(() => journals.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: journalRoleEnum('role').notNull().default('viewer'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex('journal_members_journal_user_uidx').on(table.journalId, table.userId),
		index('journal_members_user_id_idx').on(table.userId),
		index('journal_members_journal_role_idx').on(table.journalId, table.role),
	],
)

export const journalInvitations = pgTable(
	'journal_invitations',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		journalId: uuid('journal_id')
			.notNull()
			.references(() => journals.id, { onDelete: 'cascade' }),
		inviterUserId: uuid('inviter_user_id').references(() => users.id, { onDelete: 'set null' }),
		inviteeEmail: varchar('invitee_email', { length: 320 }).notNull(),
		inviteToken: text('invite_token').notNull(),
		role: journalRoleEnum('role').notNull().default('viewer'),
		status: invitationStatusEnum('status').notNull().default('pending'),
		emailDelivered: boolean('email_delivered').notNull().default(false),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
			onDelete: 'set null',
		}),
		acceptedAt: timestamp('accepted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex('journal_invitations_invite_token_uidx').on(table.inviteToken),
		index('journal_invitations_journal_status_idx').on(table.journalId, table.status),
		index('journal_invitations_email_status_idx').on(table.inviteeEmail, table.status),
	],
)

export const entries = pgTable(
	'entries',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		journalId: uuid('journal_id')
			.notNull()
			.references(() => journals.id, { onDelete: 'cascade' }),
		authorUserId: uuid('author_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 220 }),
		content: text('content').notNull().default(''),
		entryDate: date('entry_date').notNull().default(sql`CURRENT_DATE`),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		index('entries_journal_entry_date_idx').on(table.journalId, table.entryDate.desc()),
		index('entries_author_created_at_idx').on(table.authorUserId, table.createdAt.desc()),
	],
)

export const entryPhotos = pgTable(
	'entry_photos',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		entryId: uuid('entry_id')
			.notNull()
			.references(() => entries.id, { onDelete: 'cascade' }),
		uploaderUserId: uuid('uploader_user_id').references(() => users.id, { onDelete: 'set null' }),
		storageKey: text('storage_key').notNull(),
		imageUrl: text('image_url').notNull(),
		mimeType: varchar('mime_type', { length: 120 }),
		width: integer('width'),
		height: integer('height'),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex('entry_photos_storage_key_uidx').on(table.storageKey),
		index('entry_photos_entry_position_idx').on(table.entryId, table.position),
	],
)

export const usersRelations = relations(users, ({ many }) => ({
	ownedJournals: many(journals),
	journalMemberships: many(journalMembers),
	writtenEntries: many(entries),
	uploadedPhotos: many(entryPhotos),
	invitationsSent: many(journalInvitations, {
		relationName: 'journalInvitationsSent',
	}),
	invitationsAccepted: many(journalInvitations, {
		relationName: 'journalInvitationsAccepted',
	}),
}))

export const journalsRelations = relations(journals, ({ one, many }) => ({
	owner: one(users, {
		fields: [journals.ownerUserId],
		references: [users.id],
	}),
	members: many(journalMembers),
	invitations: many(journalInvitations),
	entries: many(entries),
}))

export const journalMembersRelations = relations(journalMembers, ({ one }) => ({
	journal: one(journals, {
		fields: [journalMembers.journalId],
		references: [journals.id],
	}),
	user: one(users, {
		fields: [journalMembers.userId],
		references: [users.id],
	}),
}))

export const journalInvitationsRelations = relations(journalInvitations, ({ one }) => ({
	journal: one(journals, {
		fields: [journalInvitations.journalId],
		references: [journals.id],
	}),
	inviter: one(users, {
		relationName: 'journalInvitationsSent',
		fields: [journalInvitations.inviterUserId],
		references: [users.id],
	}),
	acceptedBy: one(users, {
		relationName: 'journalInvitationsAccepted',
		fields: [journalInvitations.acceptedByUserId],
		references: [users.id],
	}),
}))

export const entriesRelations = relations(entries, ({ one, many }) => ({
	journal: one(journals, {
		fields: [entries.journalId],
		references: [journals.id],
	}),
	author: one(users, {
		fields: [entries.authorUserId],
		references: [users.id],
	}),
	photos: many(entryPhotos),
}))

export const entryPhotosRelations = relations(entryPhotos, ({ one }) => ({
	entry: one(entries, {
		fields: [entryPhotos.entryId],
		references: [entries.id],
	}),
	uploader: one(users, {
		fields: [entryPhotos.uploaderUserId],
		references: [users.id],
	}),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Journal = typeof journals.$inferSelect
export type NewJournal = typeof journals.$inferInsert

export type JournalMember = typeof journalMembers.$inferSelect
export type NewJournalMember = typeof journalMembers.$inferInsert

export type JournalInvitation = typeof journalInvitations.$inferSelect
export type NewJournalInvitation = typeof journalInvitations.$inferInsert

export type Entry = typeof entries.$inferSelect
export type NewEntry = typeof entries.$inferInsert

export type EntryPhoto = typeof entryPhotos.$inferSelect
export type NewEntryPhoto = typeof entryPhotos.$inferInsert
