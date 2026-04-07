-- CreateTable
CREATE TABLE "daily_facts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "text" TEXT NOT NULL,
    "source" TEXT,
    "branch" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_facts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_facts_branch_idx" ON "daily_facts"("branch");

-- CreateIndex
CREATE INDEX "daily_facts_isActive_idx" ON "daily_facts"("isActive");

-- CreateIndex
CREATE INDEX "daily_facts_usedAt_idx" ON "daily_facts"("usedAt");
