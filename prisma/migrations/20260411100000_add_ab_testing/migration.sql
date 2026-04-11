-- AlterTable: add A/B testing fields to questions
ALTER TABLE "questions" ADD COLUMN "variantOf" UUID;
ALTER TABLE "questions" ADD COLUMN "variantLabel" TEXT;

-- CreateIndex
CREATE INDEX "questions_variantOf_idx" ON "questions"("variantOf");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_variantOf_fkey" FOREIGN KEY ("variantOf") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
