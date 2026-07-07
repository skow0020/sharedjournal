CREATE TYPE "public"."feature_request_survey_status" AS ENUM('submitted', 'dismissed');--> statement-breakpoint
CREATE TABLE "feature_request_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_text" text,
	"status" "feature_request_survey_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_request_surveys" ADD CONSTRAINT "feature_request_surveys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feature_request_surveys_user_uidx" ON "feature_request_surveys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_request_surveys_status_idx" ON "feature_request_surveys" USING btree ("status");