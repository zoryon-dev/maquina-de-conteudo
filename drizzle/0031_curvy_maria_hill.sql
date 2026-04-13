CREATE TYPE "public"."wizard_motor" AS ENUM('tribal_v4', 'brandsdecoded_v4');--> statement-breakpoint
ALTER TABLE "content_wizards" ADD COLUMN "motor" "wizard_motor" DEFAULT 'tribal_v4' NOT NULL;