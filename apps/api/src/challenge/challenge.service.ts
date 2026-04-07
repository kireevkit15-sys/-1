import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from '../stats/stats.service';
import { QuestionService } from '../question/question.service';
import { Prisma, Difficulty, Branch } from '@prisma/client';

const CHALLENGE_QUESTION_COUNT = 3;

const XP_BY_DIFFICULTY: Record<string, { correct: number; participation: number }> = {
  BRONZE: { correct: 15, participation: 5 },
  SILVER: { correct: 25, participation: 8 },
  GOLD: { correct: 40, participation: 12 },
};

const DIFFICULTIES = ['BRONZE', 'SILVER', 'GOLD'] as const;
const BRANCHES = ['STRATEGY', 'LOGIC'] as const;

@Injectable()
export class ChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: StatsService,
    private readonly questionService: QuestionService,
  ) {}

  private todayUTC(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Deterministic daily parameters based on date.
   * Rotates difficulty and branch each day.
   */
  private getDailyParams(date: string): { difficulty: string; branch: string } {
    const dayNumber = Math.floor(new Date(date).getTime() / 86_400_000);
    const difficulty = DIFFICULTIES[dayNumber % DIFFICULTIES.length] ?? 'BRONZE';
    const branch = BRANCHES[dayNumber % BRANCHES.length] ?? 'STRATEGY';
    return { difficulty, branch };
  }

  /**
   * Get today's challenge — generate if not exists, return result if completed.
   */
  async getToday(userId: string) {
    const date = this.todayUTC();

    // Check if challenge already exists for today
    const existing = await this.prisma.dailyChallenge.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (existing?.completedAt) {
      return {
        type: 'result' as const,
        correct: existing.correct,
        total: existing.total,
        xpEarned: existing.xpEarned,
        difficulty: existing.difficulty,
        branch: existing.branch,
        category: existing.category,
        date: existing.date,
      };
    }

    if (existing) {
      // Challenge exists but not completed — return questions
      const questionIds = existing.questionIds as string[];
      const questions = await this.prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: {
          id: true,
          text: true,
          options: true,
          category: true,
          difficulty: true,
        },
      });

      return {
        type: 'questions' as const,
        difficulty: existing.difficulty,
        branch: existing.branch,
        category: existing.category,
        date: existing.date,
        questions,
      };
    }

    // Generate new challenge
    const { difficulty, branch } = this.getDailyParams(date);

    const questions = await this.questionService.getRandomForBattle({
      branch,
      difficulty,
      count: CHALLENGE_QUESTION_COUNT,
    });

    if (questions.length === 0) {
      // Fallback: try without difficulty filter
      const fallback = await this.questionService.getRandomForBattle({
        branch,
        count: CHALLENGE_QUESTION_COUNT,
      });
      if (fallback.length === 0) {
        throw new BadRequestException(
          'Нет доступных вопросов для челленджа. Попробуйте позже.',
        );
      }
      questions.push(...fallback.slice(0, CHALLENGE_QUESTION_COUNT - questions.length));
    }

    const questionIds = questions.map((q) => q.id);
    const category = questions[0]?.category ?? branch;

    const challenge = await this.prisma.dailyChallenge.create({
      data: {
        userId,
        date,
        difficulty: difficulty as Difficulty,
        branch: branch as Branch,
        category,
        questionIds: questionIds as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      type: 'questions' as const,
      difficulty: challenge.difficulty,
      branch: challenge.branch,
      category: challenge.category,
      date: challenge.date,
      questions: questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        category: q.category,
        difficulty: q.difficulty,
      })),
    };
  }

  /**
   * Submit answers for today's challenge.
   */
  async submit(
    userId: string,
    answers: { questionId: string; selectedIndex: number }[],
  ) {
    const date = this.todayUTC();

    const challenge = await this.prisma.dailyChallenge.findUnique({
      where: { userId_date: { userId, date } },
    });

    if (!challenge) {
      throw new BadRequestException(
        'Нет активного челленджа. Вызовите GET /challenge/today.',
      );
    }

    if (challenge.completedAt) {
      throw new ConflictException('Челлендж уже выполнен сегодня');
    }

    const questionIds = challenge.questionIds as string[];

    // Validate answers match challenge questions
    for (const a of answers) {
      if (!questionIds.includes(a.questionId)) {
        throw new BadRequestException(
          `Вопрос ${a.questionId} не из сегодняшнего челленджа`,
        );
      }
    }

    // Load correct answers
    const dbQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, correctIndex: true, statPrimary: true },
    });

    const correctMap = new Map(
      dbQuestions.map((q) => [q.id, q.correctIndex]),
    );

    // Count correct
    let correct = 0;
    const detailedAnswers = answers.map((a) => {
      const correctIndex = correctMap.get(a.questionId);
      const isCorrect =
        correctIndex !== undefined && a.selectedIndex === correctIndex;
      if (isCorrect) correct++;
      return {
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        correct: isCorrect,
      };
    });

    const total = answers.length;
    const xpConfig = XP_BY_DIFFICULTY[challenge.difficulty] ?? XP_BY_DIFFICULTY['BRONZE']!;
    const xpEarned =
      correct * xpConfig!.correct + (total - correct) * xpConfig!.participation;

    // Update challenge record
    await this.prisma.dailyChallenge.update({
      where: { id: challenge.id },
      data: {
        answers: detailedAnswers as unknown as Prisma.InputJsonValue,
        correct,
        total,
        xpEarned,
        completedAt: new Date(),
      },
    });

    // Reward XP — use primary stat from first question, fallback to eruditionXp
    const primaryStat = dbQuestions[0]?.statPrimary ?? 'eruditionXp';
    const validStats = ['logicXp', 'eruditionXp', 'strategyXp', 'rhetoricXp', 'intuitionXp'] as const;
    const stat = validStats.includes(primaryStat as typeof validStats[number])
      ? (primaryStat as typeof validStats[number])
      : 'eruditionXp';
    await this.stats.addXp(userId, stat, xpEarned);

    return {
      correct,
      total,
      xpEarned,
      difficulty: challenge.difficulty,
      branch: challenge.branch,
      category: challenge.category,
      date: challenge.date,
      answers: detailedAnswers,
    };
  }

  /**
   * History of past challenges.
   */
  async getHistory(userId: string, limit = 30) {
    const challenges = await this.prisma.dailyChallenge.findMany({
      where: { userId, completedAt: { not: null } },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        date: true,
        difficulty: true,
        branch: true,
        category: true,
        correct: true,
        total: true,
        xpEarned: true,
        completedAt: true,
      },
    });

    return { challenges };
  }
}
