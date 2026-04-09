-- CreateTable: B17.4 AI Token Usage tracking
CREATE TABLE "ai_token_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "date" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_token_usage_userId_idx" ON "ai_token_usage"("userId");
CREATE INDEX "ai_token_usage_date_idx" ON "ai_token_usage"("date");
CREATE INDEX "ai_token_usage_operation_idx" ON "ai_token_usage"("operation");
CREATE INDEX "ai_token_usage_userId_date_idx" ON "ai_token_usage"("userId", "date");

-- AddForeignKey
ALTER TABLE "ai_token_usage" ADD CONSTRAINT "ai_token_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
