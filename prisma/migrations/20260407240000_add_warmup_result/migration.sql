-- CreateTable
CREATE TABLE "warmup_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "timeTakenMs" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warmup_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warmup_results_userId_date_key" ON "warmup_results"("userId", "date");

-- CreateIndex
CREATE INDEX "warmup_results_userId_idx" ON "warmup_results"("userId");

-- CreateIndex
CREATE INDEX "warmup_results_date_idx" ON "warmup_results"("date");

-- AddForeignKey
ALTER TABLE "warmup_results" ADD CONSTRAINT "warmup_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
