import { format, parseISO } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJournalEntriesForJournal, type JournalEntryForJournal } from "@/data/entries";
import { getUserJournalById } from "@/data/journals";
import { getCurrentAppUser } from "@/lib/get-current-app-user";

type JournalDetailsPageProps = {
  params: Promise<{
    journalId: string;
  }>;
};

export default async function JournalDetailsPage({ params }: JournalDetailsPageProps) {
  const appUser = await getCurrentAppUser();

  if (!appUser) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Journal</CardTitle>
            <CardDescription>Sign in to view this journal.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const { journalId } = await params;
  const journal = await getUserJournalById(appUser.id, journalId);

  if (!journal) {
    notFound();
  }

  const entries = await getJournalEntriesForJournal(appUser.id, journalId);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <section className="space-y-2">
        <Link href="/dashboard" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
          Back to journals
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{journal.title}</h1>
        {journal.description ? (
          <p className="text-muted-foreground text-sm">{journal.description}</p>
        ) : null}
      </section>

      {entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No entries yet</CardTitle>
            <CardDescription>This journal does not have any entries yet.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        entries.map((entry: JournalEntryForJournal) => (
          <Card key={entry.id}>
            <CardHeader>
              <CardTitle>{entry.title || "Untitled entry"}</CardTitle>
              <CardDescription>
                {format(parseISO(entry.entryDate), "MMMM d, yyyy")} · {entry.authorName || "Unknown author"}
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
