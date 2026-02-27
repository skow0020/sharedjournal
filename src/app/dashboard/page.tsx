import { auth } from "@clerk/nextjs/server";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserJournals, type UserJournal } from "@/data/journals";
import { getUserByClerkUserId } from "@/data/users";

export default async function DashboardPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Journals</CardTitle>
            <CardDescription>Sign in to view your journals.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const currentUser = await getUserByClerkUserId(clerkUserId);

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Journals</CardTitle>
            <CardDescription>Your profile is not available yet.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const userJournals = await getUserJournals(currentUser.id);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Journals</h1>
        </div>
      </section>

      {userJournals.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No journals found</CardTitle>
            <CardDescription>You are not a member of any journals yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        userJournals.map((journal: UserJournal) => (
          <Card key={journal.id}>
            <CardHeader>
              <CardTitle>{journal.title}</CardTitle>
              <CardDescription>{journal.description || "No description"}</CardDescription>
            </CardHeader>
          </Card>
        ))
      )}
    </main>
  );
}