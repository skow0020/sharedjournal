CREATE TABLE "support_modal_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_show_after" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_modal_dismissals" ADD CONSTRAINT "support_modal_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "support_modal_dismissals_user_uidx" ON "support_modal_dismissals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_modal_dismissals_next_show_idx" ON "support_modal_dismissals" USING btree ("next_show_after");