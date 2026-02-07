CREATE TYPE "public"."article_derivation_format" AS ENUM('linkedin', 'video_script', 'carousel');--> statement-breakpoint
CREATE TYPE "public"."article_derivation_status" AS ENUM('generated', 'edited', 'published');--> statement-breakpoint
CREATE TYPE "public"."article_extension_status" AS ENUM('pending', 'diagnosed', 'in_progress', 'complete');--> statement-breakpoint
CREATE TYPE "public"."article_link_status" AS ENUM('suggested', 'approved', 'rejected', 'inserted');--> statement-breakpoint
CREATE TYPE "public"."article_wizard_step" AS ENUM('inputs', 'research', 'outline', 'production', 'assembly', 'seo_geo_check', 'optimization', 'metadata', 'cross_format', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."site_intelligence_status" AS ENUM('pending', 'crawling', 'analyzing', 'complete', 'error');--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_research';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_outline';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_section_production';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_assembly';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_seo_geo_check';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_optimization';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_metadata';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_cross_format';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'site_intelligence_crawl';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'site_intelligence_analyze';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_extension_diagnose';--> statement-breakpoint
ALTER TYPE "public"."job_type" ADD VALUE 'article_extension_expand';--> statement-breakpoint
CREATE TABLE "article_derivations" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"format" "article_derivation_format" NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb,
	"status" "article_derivation_status" DEFAULT 'generated' NOT NULL,
	"published_at" timestamp,
	"published_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_extensions" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"original_url" text NOT NULL,
	"diagnosis" jsonb DEFAULT '{}'::jsonb,
	"selected_fixes" jsonb DEFAULT '[]'::jsonb,
	"generated_content" jsonb DEFAULT '{}'::jsonb,
	"status" "article_extension_status" DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_geo_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"overall_score" integer DEFAULT 0,
	"direct_answers" integer DEFAULT 0,
	"citable_data" integer DEFAULT 0,
	"extractable_structure" integer DEFAULT 0,
	"authority_eeat" integer DEFAULT 0,
	"topic_coverage" integer DEFAULT 0,
	"schema_metadata" integer DEFAULT 0,
	"report" jsonb DEFAULT '{}'::jsonb,
	"priority_fixes" jsonb DEFAULT '[]'::jsonb,
	"analyzed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "article_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"target_url" text NOT NULL,
	"anchor_text" text NOT NULL,
	"relevance_score" integer DEFAULT 0,
	"is_reverse" boolean DEFAULT false,
	"status" "article_link_status" DEFAULT 'suggested' NOT NULL,
	"insertion_point" text,
	"rationale" text,
	"inserted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"meta_titles" jsonb DEFAULT '[]'::jsonb,
	"meta_descriptions" jsonb DEFAULT '[]'::jsonb,
	"slug" text,
	"alt_texts" jsonb DEFAULT '[]'::jsonb,
	"schema_article" jsonb DEFAULT '{}'::jsonb,
	"schema_faq" jsonb,
	"schema_howto" jsonb,
	"schema_breadcrumb" jsonb,
	"reverse_anchors" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" integer,
	"current_step" "article_wizard_step" DEFAULT 'inputs' NOT NULL,
	"mode" text DEFAULT 'create',
	"title" text,
	"primary_keyword" text,
	"secondary_keywords" jsonb,
	"article_type" text,
	"target_word_count" integer DEFAULT 2000,
	"reference_url" text,
	"reference_mother_url" text,
	"model" text,
	"custom_instructions" text,
	"author_name" text,
	"rag_config" jsonb,
	"extracted_base_content" jsonb,
	"extracted_mother_content" jsonb,
	"research_results" jsonb,
	"synthesized_research" jsonb,
	"generated_outlines" jsonb,
	"selected_outline_id" text,
	"produced_sections" jsonb,
	"assembled_content" text,
	"assembled_with_links" text,
	"seo_score" integer,
	"geo_score" integer,
	"seo_report" jsonb,
	"geo_report" jsonb,
	"optimized_content" text,
	"final_title" text,
	"final_content" text,
	"final_word_count" integer,
	"job_id" integer,
	"job_status" "job_status",
	"processing_progress" jsonb,
	"job_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"site_url" text,
	"brand_presets" jsonb,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "site_intelligence" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"site_url" text NOT NULL,
	"url_map" jsonb DEFAULT '{}'::jsonb,
	"brand_voice_profile" jsonb DEFAULT '{}'::jsonb,
	"keyword_gaps" jsonb DEFAULT '{}'::jsonb,
	"competitor_urls" jsonb,
	"crawled_at" timestamp,
	"urls_count" integer DEFAULT 0,
	"status" "site_intelligence_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "article_derivations" ADD CONSTRAINT "article_derivations_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_extensions" ADD CONSTRAINT "article_extensions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_geo_scores" ADD CONSTRAINT "article_geo_scores_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_links" ADD CONSTRAINT "article_links_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_metadata" ADD CONSTRAINT "article_metadata_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_intelligence" ADD CONSTRAINT "site_intelligence_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_derivations_article_id_idx" ON "article_derivations" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_derivations_format_idx" ON "article_derivations" USING btree ("format");--> statement-breakpoint
CREATE INDEX "article_extensions_article_id_idx" ON "article_extensions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_geo_scores_article_id_idx" ON "article_geo_scores" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_links_article_id_idx" ON "article_links" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_links_status_idx" ON "article_links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "article_metadata_article_id_idx" ON "article_metadata" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "articles_user_id_idx" ON "articles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "articles_project_id_idx" ON "articles" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "articles_current_step_idx" ON "articles" USING btree ("current_step");--> statement-breakpoint
CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "site_intelligence_project_id_idx" ON "site_intelligence" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "site_intelligence_status_idx" ON "site_intelligence" USING btree ("status");