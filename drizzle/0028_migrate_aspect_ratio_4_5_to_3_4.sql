-- Migrate Instagram aspect ratio from 4:5 (1080x1350) to 3:4 (1080x1440)
-- This is a data migration — no schema changes.

-- 1. Update creative_outputs format column
UPDATE "creative_outputs" SET "format" = '3:4' WHERE "format" = '4:5';

-- 2. Update creative_projects selected_formats JSONB array
UPDATE "creative_projects"
SET "selected_formats" = (
  SELECT jsonb_agg(
    CASE WHEN elem #>> '{}' = '4:5' THEN '"3:4"'::jsonb ELSE elem END
  )
  FROM jsonb_array_elements("selected_formats") AS elem
)
WHERE "selected_formats"::text LIKE '%"4:5"%';
