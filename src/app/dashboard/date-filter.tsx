"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";

type DateFilterProps = {
  value: string;
};

export function DateFilter({ value }: DateFilterProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleDateChange = (nextDate: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor="entry-date" className="text-sm font-medium">
        Date
      </label>
      <Input
        id="entry-date"
        type="date"
        defaultValue={value}
        max="9999-12-31"
        onChange={(event) => handleDateChange(event.target.value)}
        aria-busy={isPending}
      />
    </div>
  );
}