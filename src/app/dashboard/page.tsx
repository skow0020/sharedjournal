import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { format, isValid, parseISO } from "date-fns";

import { DateFilter } from "@/app/dashboard/date-filter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import { entries, journalMembers, journals, users } from "@/db/schema";

type DashboardPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function getSelectedDate(dateValue?: string) {
  if (!dateValue || !DATE_PATTERN.test(dateValue)) {
    return format(new Date(), "yyyy-MM-dd");
  }

  const parsedDate = parseISO(dateValue);

  if (!isValid(parsedDate)) {
    return format(new Date(), "yyyy-MM-dd");
  }

  return dateValue;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId: clerkUserId } = await auth();
  const params = await searchParams;
  const selectedDate = getSelectedDate(params?.date);

  if (!clerkUserId) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Sign in to view your journal entries.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const [currentUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!currentUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>Your profile is not available yet.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const journalEntries = await db
    .select({
      id: entries.id,
      title: entries.title,
      content: entries.content,
      journalTitle: journals.title,
      authorName: users.displayName,
      createdAt: entries.createdAt,
    })
    .from(entries)
    .innerJoin(journalMembers, eq(journalMembers.journalId, entries.journalId))
    .innerJoin(journals, eq(journals.id, entries.journalId))
    .innerJoin(users, eq(users.id, entries.authorUserId))
    .where(
      and(
        eq(journalMembers.userId, currentUser.id),
        eq(entries.entryDate, selectedDate),
      ),
    )
    .orderBy(desc(entries.createdAt));

  const headingDate = format(parseISO(selectedDate), "MMMM d, yyyy");

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Journal entries for {headingDate}</CardDescription>
        </CardHeader>
        <CardContent>
          <DateFilter value={selectedDate} />
        </CardContent>
      </Card>

      {journalEntries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No entries found</CardTitle>
            <CardDescription>There are no journal entries for this date.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        journalEntries.map((entry) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle>{entry.title || "Untitled entry"}</CardTitle>
              <CardDescription>
                {entry.journalTitle} · {entry.authorName || "Unknown author"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 whitespace-pre-wrap">{entry.content}</p>
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}