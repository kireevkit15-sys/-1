import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { LevelName } from '@prisma/client';
import type {
  BarrierRecallDto,
  BarrierConnectDto,
  BarrierApplyDto,
  BarrierDefendDto,
} from './dto/barrier.dto';

const LEVEL_ORDER: LevelName[] = [
  'SLEEPING',
  'AWAKENED',
  'OBSERVER',
  'WARRIOR',
  'STRATEGIST',
  'MASTER',
];

const PASS_THRESHOLD = 0.6;

@Injectable()
export class BarrierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // ── B22.1: GET /learning/barrier ────────────────────────────────────

  async getBarrier(userId: string) {
    const path = await this.getPathOrFail(userId);

    // Get concepts from completed days for current level
    const completedDays = await this.prisma.learningDay.findMany({
      where: {
        pathId: path.id,
        completedAt: { not: null },
      },
      include: { concept: true },
      orderBy: { dayNumber: 'desc' },
      take: 10,
    });

    if (completedDays.length < 3) {
      throw new BadRequestException('Complete at least 3 days before attempting a barrier');
    }

    const concepts = completedDays.map((d) => d.concept);

    // Check for existing active barrier
    const existingBarrier = await this.prisma.levelBarrier.findFirst({
      where: {
        pathId: path.id,
        level: path.currentLevel,
        passed: null,
      },
    });

    if (existingBarrier) {
      return {
        barrierId: existingBarrier.id,
        level: existingBarrier.level,
        attemptNumber: existingBarrier.attemptNumber,
        stages: existingBarrier.stages,
        resuming: true,
      };
    }

    // Count previous attempts
    const prevAttempts = await this.prisma.levelBarrier.count({
      where: {
        pathId: path.id,
        level: path.currentLevel,
      },
    });

    // Generate barrier content
    const recallQuestions = this.generateRecallQuestions(concepts);
    const connectPairs = this.generateConnectPairs(concepts);
    const applySituations = this.generateApplySituations(concepts);

    const stages = {
      recall: { questions: recallQuestions, results: null },
      connect: { pairs: connectPairs, results: null },
      apply: { situations: applySituations, results: null },
      defend: { rounds: [], results: null },
      verdict: null,
    };

    const barrier = await this.prisma.levelBarrier.create({
      data: {
        pathId: path.id,
        level: path.currentLevel,
        stages: JSON.parse(JSON.stringify(stages)),
        attemptNumber: prevAttempts + 1,
      },
    });

    return {
      barrierId: barrier.id,
      level: barrier.level,
      attemptNumber: barrier.attemptNumber,
      stages,
      resuming: false,
    };
  }

  // ── B22.2: POST /learning/barrier/recall ────────────────────────────

  async submitRecall(userId: string, dto: BarrierRecallDto) {
    const { barrier } = await this.getActiveBarrier(userId);
    const stages = barrier.stages as Record<string, unknown>;
    const recallStage = stages.recall as { questions: unknown[]; results: unknown };

    if (recallStage.results) {
      throw new ConflictException('Recall stage already completed');
    }

    // Grade each answer via AI
    const results = await Promise.all(
      dto.answers.map(async (answer) => {
        const concept = await this.prisma.concept.findUnique({
          where: { id: answer.conceptId },
        });

        if (!concept) return { conceptId: answer.conceptId, score: 0, feedback: 'Concept not found' };

        const gradeText = await this.ai.chatCompletion(
          [
            {
              role: 'system',
              content: `Оцени, насколько точно ученик вспомнил концепт "${concept.nameRu}".
Описание: ${concept.description}
Оцени от 0 до 1 (0 = не помнит, 0.5 = частично, 1 = точно помнит).
Ответь JSON: {"score": число, "feedback": "краткий комментарий"}`,
            },
            { role: 'user', content: answer.answer },
          ],
          { userId, operation: 'barrier_recall' },
        );

        try {
          return { conceptId: answer.conceptId, ...JSON.parse(gradeText) };
        } catch {
          return { conceptId: answer.conceptId, score: 0.5, feedback: 'Оценка не определена' };
        }
      }),
    );

    const avgScore = results.reduce((s, r) => s + (r.score as number), 0) / results.length;

    recallStage.results = { answers: results, avgScore };
    await this.updateBarrierStages(barrier.id, stages);

    return { stage: 'recall', results, avgScore };
  }

  // ── B22.3: POST /learning/barrier/connect ───────────────────────────

  async submitConnect(userId: string, dto: BarrierConnectDto) {
    const { barrier } = await this.getActiveBarrier(userId);
    const stages = barrier.stages as Record<string, unknown>;
    const connectStage = stages.connect as { pairs: unknown[]; results: unknown };

    if (connectStage.results) {
      throw new ConflictException('Connect stage already completed');
    }

    const results = await Promise.all(
      dto.pairs.map(async (pair) => {
        const [conceptA, conceptB] = await Promise.all([
          this.prisma.concept.findUnique({ where: { id: pair.conceptA } }),
          this.prisma.concept.findUnique({ where: { id: pair.conceptB } }),
        ]);

        if (!conceptA || !conceptB) {
          return { conceptA: pair.conceptA, conceptB: pair.conceptB, score: 0, feedback: 'Concept not found' };
        }

        const gradeText = await this.ai.chatCompletion(
          [
            {
              role: 'system',
              content: `Ученик объясняет связь между концептами:
1. "${conceptA.nameRu}": ${conceptA.description}
2. "${conceptB.nameRu}": ${conceptB.description}
Оцени качество объяснения связи от 0 до 1.
JSON: {"score": число, "feedback": "комментарий"}`,
            },
            { role: 'user', content: pair.explanation },
          ],
          { userId, operation: 'barrier_connect' },
        );

        try {
          return { conceptA: pair.conceptA, conceptB: pair.conceptB, ...JSON.parse(gradeText) };
        } catch {
          return { conceptA: pair.conceptA, conceptB: pair.conceptB, score: 0.5, feedback: 'Оценка не определена' };
        }
      }),
    );

    const avgScore = results.reduce((s, r) => s + (r.score as number), 0) / results.length;

    connectStage.results = { pairs: results, avgScore };
    await this.updateBarrierStages(barrier.id, stages);

    return { stage: 'connect', results, avgScore };
  }

  // ── B22.4: POST /learning/barrier/apply ─────────────────────────────

  async submitApply(userId: string, dto: BarrierApplyDto) {
    const { barrier } = await this.getActiveBarrier(userId);
    const stages = barrier.stages as Record<string, unknown>;
    const applyStage = stages.apply as { situations: unknown[]; results: unknown };

    if (applyStage.results) {
      throw new ConflictException('Apply stage already completed');
    }

    const results = await Promise.all(
      dto.answers.map(async (answer) => {
        const gradeText = await this.ai.chatCompletion(
          [
            {
              role: 'system',
              content: `Ученик применяет изученные концепты к новой ситуации.
Оцени, насколько глубоко и корректно он применил знания. От 0 до 1.
JSON: {"score": число, "feedback": "комментарий", "conceptsApplied": ["какие концепты использовал"]}`,
            },
            { role: 'user', content: answer.answer },
          ],
          { userId, operation: 'barrier_apply' },
        );

        try {
          return { situationIndex: answer.situationIndex, ...JSON.parse(gradeText) };
        } catch {
          return { situationIndex: answer.situationIndex, score: 0.5, feedback: 'Оценка не определена', conceptsApplied: [] };
        }
      }),
    );

    const avgScore = results.reduce((s, r) => s + (r.score as number), 0) / results.length;

    applyStage.results = { answers: results, avgScore };
    await this.updateBarrierStages(barrier.id, stages);

    return { stage: 'apply', results, avgScore };
  }

  // ── B22.5: POST /learning/barrier/defend ────────────────────────────

  async submitDefend(userId: string, dto: BarrierDefendDto) {
    const barrier = await this.prisma.levelBarrier.findUnique({
      where: { id: dto.barrierId },
      include: { path: true },
    });

    if (!barrier || barrier.path.userId !== userId) {
      throw new NotFoundException('Barrier not found');
    }

    if (barrier.passed !== null) {
      throw new ConflictException('Barrier already completed');
    }

    const stages = barrier.stages as Record<string, unknown>;
    const defendStage = stages.defend as { rounds: Array<{ role: string; content: string }>; results: unknown };

    if (defendStage.results) {
      throw new ConflictException('Defend stage already completed');
    }

    // Get concepts for context
    const completedDays = await this.prisma.learningDay.findMany({
      where: { pathId: barrier.pathId, completedAt: { not: null } },
      include: { concept: { select: { nameRu: true, description: true } } },
      take: 5,
    });

    const conceptsContext = completedDays
      .map((d) => `"${d.concept.nameRu}": ${d.concept.description}`)
      .join('\n');

    // Build conversation history
    const history = defendStage.rounds.map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
    }));

    const round = (dto.round ?? history.filter((m) => m.role === 'user').length) + 1;

    const aiResponse = await this.ai.chatCompletion(
      [
        {
          role: 'system',
          content: `Ты — оппонент на испытании платформы РАЗУМ. Ученик прошёл уровень "${barrier.level}".
Концепты: ${conceptsContext}

Твоя задача: оспаривать позицию ученика, давить, искать слабые места в аргументации.
Раунд ${round} из 4. ${round >= 4 ? 'Это последний раунд. Подведи итог, дай оценку.' : 'Продолжай давить.'}
${round >= 4 ? 'В конце добавь JSON: {"score": 0-1, "feedback": "итог"}' : ''}`,
        },
        ...history,
        { role: 'user' as const, content: dto.message },
      ],
      { userId, operation: 'barrier_defend', maxTokens: 512 },
    );

    // Record this round
    defendStage.rounds.push(
      { role: 'user', content: dto.message },
      { role: 'assistant', content: aiResponse },
    );

    // If final round, extract score
    if (round >= 4) {
      const scoreMatch = aiResponse.match(/"score"\s*:\s*([\d.]+)/);
      const feedbackMatch = aiResponse.match(/"feedback"\s*:\s*"([^"]+)"/);

      defendStage.results = {
        score: scoreMatch?.[1] ? parseFloat(scoreMatch[1]) : 0.5,
        feedback: feedbackMatch?.[1] ?? 'Испытание завершено',
        totalRounds: round,
      };
    }

    await this.updateBarrierStages(barrier.id, stages);

    return {
      stage: 'defend',
      round,
      aiResponse,
      completed: round >= 4,
      results: defendStage.results,
    };
  }

  // ── B22.6: POST /learning/barrier/complete ──────────────────────────

  async completeBarrier(userId: string) {
    const { barrier, path } = await this.getActiveBarrier(userId);
    const stages = barrier.stages as Record<string, unknown>;

    // Collect scores from all stages
    const recallResults = (stages.recall as { results: { avgScore: number } | null })?.results;
    const connectResults = (stages.connect as { results: { avgScore: number } | null })?.results;
    const applyResults = (stages.apply as { results: { avgScore: number } | null })?.results;
    const defendResults = (stages.defend as { results: { score: number } | null })?.results;

    if (!recallResults || !connectResults || !applyResults || !defendResults) {
      throw new BadRequestException('Complete all 4 stages before finishing the barrier');
    }

    // Weighted average: recall 20%, connect 25%, apply 30%, defend 25%
    const totalScore =
      recallResults.avgScore * 0.2 +
      connectResults.avgScore * 0.25 +
      applyResults.avgScore * 0.3 +
      defendResults.score * 0.25;

    const passed = totalScore >= PASS_THRESHOLD;

    // Update barrier
    const verdict = {
      totalScore,
      passed,
      breakdown: {
        recall: recallResults.avgScore,
        connect: connectResults.avgScore,
        apply: applyResults.avgScore,
        defend: defendResults.score,
      },
    };

    (stages as Record<string, unknown>).verdict = verdict;

    await this.prisma.levelBarrier.update({
      where: { id: barrier.id },
      data: {
        score: totalScore,
        passed,
        stages: JSON.parse(JSON.stringify(stages)),
      },
    });

    if (passed) {
      // Advance to next level
      const currentIdx = LEVEL_ORDER.indexOf(path.currentLevel);
      const nextLevel = LEVEL_ORDER[currentIdx + 1];

      if (nextLevel) {
        await this.prisma.learningPath.update({
          where: { id: path.id },
          data: { currentLevel: nextLevel },
        });
      }
    }

    return {
      passed,
      totalScore,
      breakdown: verdict.breakdown,
      newLevel: passed
        ? LEVEL_ORDER[LEVEL_ORDER.indexOf(path.currentLevel) + 1] ?? path.currentLevel
        : null,
      message: passed
        ? 'Испытание пройдено. Ты поднялся на новый уровень.'
        : 'Испытание не пройдено. Повтори слабые темы и попробуй снова.',
    };
  }

  // ── B22.7: Retake logic ─────────────────────────────────────────────

  async getRetakeInfo(userId: string) {
    const path = await this.getPathOrFail(userId);

    const lastBarrier = await this.prisma.levelBarrier.findFirst({
      where: {
        pathId: path.id,
        level: path.currentLevel,
        passed: false,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    if (!lastBarrier) {
      throw new NotFoundException('No failed barrier found for current level');
    }

    const stages = lastBarrier.stages as Record<string, unknown>;
    const weakConcepts: string[] = [];

    // Analyze recall results to find weak concepts
    const recallResults = stages.recall as { results: { answers: Array<{ conceptId: string; score: number }> } | null };
    if (recallResults?.results) {
      for (const answer of recallResults.results.answers) {
        if (answer.score < 0.5) {
          weakConcepts.push(answer.conceptId);
        }
      }
    }

    // Find days to review
    const daysToReview = await this.prisma.learningDay.findMany({
      where: {
        pathId: path.id,
        conceptId: weakConcepts.length > 0 ? { in: weakConcepts } : undefined,
        completedAt: { not: null },
      },
      include: {
        concept: { select: { id: true, nameRu: true, branch: true } },
      },
      orderBy: { dayNumber: 'asc' },
    });

    return {
      attemptNumber: lastBarrier.attemptNumber,
      score: lastBarrier.score,
      weakConcepts: daysToReview.map((d) => ({
        conceptId: d.concept.id,
        name: d.concept.nameRu,
        branch: d.concept.branch,
        dayNumber: d.dayNumber,
      })),
      message: `Повтори ${daysToReview.length} тем перед пересдачей.`,
      canRetake: true,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private async getPathOrFail(userId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    return path;
  }

  private async getActiveBarrier(userId: string) {
    const path = await this.getPathOrFail(userId);

    const barrier = await this.prisma.levelBarrier.findFirst({
      where: {
        pathId: path.id,
        level: path.currentLevel,
        passed: null,
      },
      orderBy: { attemptedAt: 'desc' },
    });

    if (!barrier) {
      throw new NotFoundException('No active barrier found. Start one with GET /learning/barrier');
    }

    return { barrier, path };
  }

  private async updateBarrierStages(barrierId: string, stages: Record<string, unknown>) {
    await this.prisma.levelBarrier.update({
      where: { id: barrierId },
      data: { stages: JSON.parse(JSON.stringify(stages)) },
    });
  }

  private generateRecallQuestions(concepts: Array<{ id: string; nameRu: string }>) {
    // Pick up to 6 concepts for recall
    const selected = concepts.slice(0, 6);
    return selected.map((c) => ({
      conceptId: c.id,
      prompt: `Что ты помнишь о концепте "${c.nameRu}"? Объясни кратко (1-2 предложения).`,
    }));
  }

  private generateConnectPairs(concepts: Array<{ id: string; nameRu: string }>) {
    // Create up to 3 pairs from concepts
    const pairs: Array<{ conceptA: string; conceptB: string; nameA: string; nameB: string }> = [];
    for (let i = 0; i < Math.min(3, Math.floor(concepts.length / 2)); i++) {
      const a = concepts[i * 2];
      const b = concepts[i * 2 + 1];
      if (a && b) {
        pairs.push({ conceptA: a.id, conceptB: b.id, nameA: a.nameRu, nameB: b.nameRu });
      }
    }
    return pairs;
  }

  private generateApplySituations(concepts: Array<{ id: string; nameRu: string }>) {
    const conceptNames = concepts.slice(0, 4).map((c) => c.nameRu);
    return [
      {
        index: 0,
        situation: `Представь, что ты руководитель команды. Как бы ты применил знания о ${conceptNames[0] ?? 'изученных концептах'} и ${conceptNames[1] ?? 'связанных идеях'} в конфликтной ситуации?`,
      },
      {
        index: 1,
        situation: `Друг просит совета. Как бы ты объяснил ему суть ${conceptNames[2] ?? 'пройденных тем'} и ${conceptNames[3] ?? 'их практическое применение'} простыми словами?`,
      },
    ];
  }
}
