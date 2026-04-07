-- CreateTable (pgvector skipped for local dev)
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "branch" "Branch" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_chunks_branch_idx" ON "knowledge_chunks"("branch");

-- CreateIndex
CREATE INDEX "knowledge_chunks_category_idx" ON "knowledge_chunks"("category");

-- CreateIndex
CREATE INDEX "knowledge_chunks_topic_idx" ON "knowledge_chunks"("topic");
