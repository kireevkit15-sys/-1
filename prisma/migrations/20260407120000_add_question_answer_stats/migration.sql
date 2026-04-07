-- BC9: Add answer statistics fields to questions table for adaptive difficulty

ALTER TABLE "questions" ADD COLUMN "totalAnswers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "questions" ADD COLUMN "correctAnswers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "questions" ADD COLUMN "avgTimeTakenMs" INTEGER;
ALTER TABLE "questions" ADD COLUMN "lastCalibratedAt" TIMESTAMP(3);
