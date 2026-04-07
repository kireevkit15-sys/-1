-- CreateIndex: composite index for question selection by branch + difficulty
CREATE INDEX "questions_branch_difficulty_isActive_idx" ON "questions"("branch", "difficulty", "isActive");

-- CreateIndex: battle lookups by player + status
CREATE INDEX "battles_player1Id_status_idx" ON "battles"("player1Id", "status");
CREATE INDEX "battles_player2Id_status_idx" ON "battles"("player2Id", "status");
CREATE INDEX "battles_status_idx" ON "battles"("status");
CREATE INDEX "battles_createdAt_idx" ON "battles"("createdAt");

-- CreateIndex: leaderboard by rating DESC
CREATE INDEX "user_stats_rating_idx" ON "user_stats"("rating" DESC);
