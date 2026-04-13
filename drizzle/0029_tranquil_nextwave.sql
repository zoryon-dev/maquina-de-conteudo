CREATE TABLE "brand_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"config" jsonb NOT NULL,
	"message" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"owner_user_id" text,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "content_wizards" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "creative_projects" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "library_items" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "themes" ADD COLUMN "brand_id" integer;--> statement-breakpoint
ALTER TABLE "brand_versions" ADD CONSTRAINT "brand_versions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_versions" ADD CONSTRAINT "brand_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brand_versions_brand_id_idx" ON "brand_versions" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "brand_versions_created_at_idx" ON "brand_versions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brands_slug_idx" ON "brands" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "brands_is_default_idx" ON "brands" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "brands_owner_user_id_idx" ON "brands" USING btree ("owner_user_id");--> statement-breakpoint
ALTER TABLE "content_wizards" ADD CONSTRAINT "content_wizards_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_projects" ADD CONSTRAINT "creative_projects_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_posts" ADD CONSTRAINT "scheduled_posts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;