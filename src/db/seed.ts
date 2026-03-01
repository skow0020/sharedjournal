import { db } from './index'
import {
	entries,
	entryPhotos,
	journalInvitations,
	journalMembers,
	journals,
	users,
} from './schema'

async function seed() {
	await db
		.insert(users)
		.values([
			{
				id: '11111111-1111-1111-1111-111111111111',
				clerkUserId: 'user_3A2AcIUd4A9Ym1qJjgWTfJeZYqr',
				displayName: 'Colin',
				imageUrl: 'https://images.example.com/u/colin.jpg',
				createdAt: new Date('2026-02-20T14:00:00Z'),
			},
			{
				id: '22222222-2222-2222-2222-222222222222',
				clerkUserId: 'user_friend_alex_001',
				displayName: 'Alex Rivera',
				imageUrl: 'https://images.example.com/u/alex.jpg',
				createdAt: new Date('2026-02-20T14:05:00Z'),
			},
			{
				id: '33333333-3333-3333-3333-333333333333',
				clerkUserId: 'user_friend_maya_001',
				displayName: 'Maya Chen',
				imageUrl: 'https://images.example.com/u/maya.jpg',
				createdAt: new Date('2026-02-20T14:10:00Z'),
			},
		])
		.onConflictDoNothing()

	await db
		.insert(journals)
		.values([
			{
				id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				title: 'Weekend Adventures',
				description: 'Shared stories, trips, and snapshots.',
				ownerUserId: '11111111-1111-1111-1111-111111111111',
				createdAt: new Date('2026-02-20T15:00:00Z'),
				updatedAt: new Date('2026-02-22T10:00:00Z'),
			},
			{
				id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
				title: 'Family Notes',
				description: 'A private family journal.',
				ownerUserId: '11111111-1111-1111-1111-111111111111',
				createdAt: new Date('2026-02-21T08:00:00Z'),
				updatedAt: new Date('2026-02-22T09:30:00Z'),
			},
		])
		.onConflictDoNothing()

	await db
		.insert(journalMembers)
		.values([
			{
				id: '44444444-1111-1111-1111-111111111111',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				userId: '11111111-1111-1111-1111-111111111111',
				role: 'owner',
				createdAt: new Date('2026-02-20T15:01:00Z'),
			},
			{
				id: '44444444-2222-2222-2222-222222222222',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				userId: '22222222-2222-2222-2222-222222222222',
				role: 'editor',
				createdAt: new Date('2026-02-20T15:02:00Z'),
			},
			{
				id: '44444444-3333-3333-3333-333333333333',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				userId: '33333333-3333-3333-3333-333333333333',
				role: 'viewer',
				createdAt: new Date('2026-02-20T15:03:00Z'),
			},
			{
				id: '44444444-4444-4444-4444-444444444444',
				journalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
				userId: '11111111-1111-1111-1111-111111111111',
				role: 'owner',
				createdAt: new Date('2026-02-21T08:01:00Z'),
			},
		])
		.onConflictDoNothing()

	await db
		.insert(journalInvitations)
		.values([
			{
				id: '55555555-1111-1111-1111-111111111111',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				inviterUserId: '11111111-1111-1111-1111-111111111111',
				inviteeEmail: 'alex@example.com',
				inviteToken: 'inv_wkend_alex_20260220',
				role: 'editor',
				status: 'accepted',
				expiresAt: new Date('2026-03-01T00:00:00Z'),
				acceptedByUserId: '22222222-2222-2222-2222-222222222222',
				acceptedAt: new Date('2026-02-20T15:02:30Z'),
				createdAt: new Date('2026-02-20T14:50:00Z'),
			},
			{
				id: '55555555-2222-2222-2222-222222222222',
				journalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
				inviterUserId: '11111111-1111-1111-1111-111111111111',
				inviteeEmail: 'sam@example.com',
				inviteToken: 'inv_family_sam_20260221',
				role: 'viewer',
				status: 'pending',
				expiresAt: new Date('2026-03-05T00:00:00Z'),
				acceptedByUserId: null,
				acceptedAt: null,
				createdAt: new Date('2026-02-21T08:10:00Z'),
			},
		])
		.onConflictDoNothing()

	await db
		.insert(entries)
		.values([
			{
				id: '66666666-1111-1111-1111-111111111111',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				authorUserId: '11111111-1111-1111-1111-111111111111',
				title: 'Sunrise Hike',
				content: 'Started at 6am and reached the ridge by 7:15. Incredible colors.',
				entryDate: '2026-02-22',
				createdAt: new Date('2026-02-22T12:00:00Z'),
				updatedAt: new Date('2026-02-22T12:10:00Z'),
			},
			{
				id: '66666666-2222-2222-2222-222222222222',
				journalId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
				authorUserId: '22222222-2222-2222-2222-222222222222',
				title: 'Post-hike Brunch',
				content: 'Found a cafe nearby with amazing pancakes and coffee.',
				entryDate: '2026-02-22',
				createdAt: new Date('2026-02-22T13:00:00Z'),
				updatedAt: new Date('2026-02-22T13:00:00Z'),
			},
			{
				id: '66666666-3333-3333-3333-333333333333',
				journalId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
				authorUserId: '11111111-1111-1111-1111-111111111111',
				title: 'Weekly Family Check-in',
				content: 'Shared schedules and meal plan for next week.',
				entryDate: '2026-02-21',
				createdAt: new Date('2026-02-21T19:00:00Z'),
				updatedAt: new Date('2026-02-21T19:00:00Z'),
			},
		])
		.onConflictDoNothing()

	await db
		.insert(entryPhotos)
		.values([
			{
				id: '77777777-1111-1111-1111-111111111111',
				entryId: '66666666-1111-1111-1111-111111111111',
				uploaderUserId: '11111111-1111-1111-1111-111111111111',
				storageKey:
					'journals/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/entries/66666666-1111-1111-1111-111111111111/sunrise-1.jpg',
				imageUrl: 'https://cdn.example.com/journals/a/entries/e1/sunrise-1.jpg',
				mimeType: 'image/jpeg',
				width: 4032,
				height: 3024,
				position: 0,
				createdAt: new Date('2026-02-22T12:02:00Z'),
			},
			{
				id: '77777777-2222-2222-2222-222222222222',
				entryId: '66666666-1111-1111-1111-111111111111',
				uploaderUserId: '11111111-1111-1111-1111-111111111111',
				storageKey:
					'journals/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/entries/66666666-1111-1111-1111-111111111111/sunrise-2.jpg',
				imageUrl: 'https://cdn.example.com/journals/a/entries/e1/sunrise-2.jpg',
				mimeType: 'image/jpeg',
				width: 4032,
				height: 3024,
				position: 1,
				createdAt: new Date('2026-02-22T12:03:00Z'),
			},
			{
				id: '77777777-3333-3333-3333-333333333333',
				entryId: '66666666-2222-2222-2222-222222222222',
				uploaderUserId: '22222222-2222-2222-2222-222222222222',
				storageKey:
					'journals/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/entries/66666666-2222-2222-2222-222222222222/brunch.jpg',
				imageUrl: 'https://cdn.example.com/journals/a/entries/e2/brunch.jpg',
				mimeType: 'image/jpeg',
				width: 3024,
				height: 3024,
				position: 0,
				createdAt: new Date('2026-02-22T13:05:00Z'),
			},
		])
		.onConflictDoNothing()

	console.log('Seed complete.')
}

seed().catch((error) => {
	console.error('Seed failed:', error)
	process.exit(1)
})