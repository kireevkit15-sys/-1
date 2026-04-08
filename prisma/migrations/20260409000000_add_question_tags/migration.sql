-- B14.6: Add tags array to questions
ALTER TABLE "questions" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';

-- GIN index for array search (hasSome / hasEvery)
CREATE INDEX "questions_tags_idx" ON "questions" USING GIN ("tags");
