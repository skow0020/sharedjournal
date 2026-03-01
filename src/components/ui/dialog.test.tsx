import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

describe("Dialog", () => {
  it("opens dialog content when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Create a journal</DialogTitle>
          <DialogDescription>Fill out details.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText("Create a journal")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    expect(screen.getByText("Create a journal")).toBeInTheDocument();
    expect(screen.getByText("Fill out details.")).toBeInTheDocument();
  });
});
