import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { LevelName } from '@prisma/client';
import type { DetermineDto } from './dto/determine.dto';
import type { InteractDto } from './dto/interact.dto';
import type { ExplainDto } from './dto/explain.dto';

const LEVEL_ORDER: LevelName[] = [
  'SLEEPING',
  'AWAKENED',
  'OBSERVER',
  'WARRIOR',
  'STRATEGIST',
  'MASTER',
];

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // ── B21.2: POST /learning/determine ─────────────────────────────────

  async determine(userId: string, dto: DetermineDto) {
    const existingPath = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (existingPath) {
      throw new ConflictException('Learning path already exists. Use POST /learning/start to continue.');
    }

    // Analyze answers to determine start zone, pain point, delivery style
    const { startZone, painPoint, deliveryStyle } = this.analyzeDetermination(dto);

    return {
      startZone,
      painPoint,
      deliveryStyle,
      message: 'Система настроена. Твой путь начинается.',
    };
  }

  // ── B21.3: POST /learning/start ─────────────────────────────────────

  async start(userId: string, determination?: { startZone: string; painPoint: string; deliveryStyle: string }) {
    const existingPath = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (existingPath) {
      throw new ConflictException('Learning path already exists');
    }

    // Build personal route based on knowledge graph
    const concepts = await this.prisma.concept.findMany({
      orderBy: [{ difficulty: 'asc' }, { bloomLevel: 'asc' }],
      select: {
        id: true,
        slug: true,
        nameRu: true,
        description: true,
        branch: true,
        difficulty: true,
        bloomLevel: true,
        relationsFrom: {
          where: { relationType: 'PREREQUISITE' },
          select: { targetId: true },
        },
      },
    });

    if (concepts.length === 0) {
      throw new BadRequestException('No concepts available. Seed the database first.');
    }

    // Sort concepts respecting prerequisites (topological sort)
    const orderedConcepts = this.buildConceptOrder(concepts, determination?.startZone);

    const path = await this.prisma.learningPath.create({
      data: {
        userId,
        currentLevel: 'SLEEPING',
        currentDay: 1,
        startZone: determination?.startZone ?? null,
        painPoint: determination?.painPoint ?? null,
        deliveryStyle: determination?.deliveryStyle ?? null,
      },
    });

    // Create learning days from ordered concepts
    const daysData = orderedConcepts.slice(0, 30).map((concept, idx) => ({
      pathId: path.id,
      dayNumber: idx + 1,
      conceptId: concept.id,
      cards: this.generateDefaultCards(concept),
    }));

    if (daysData.length > 0) {
      await this.prisma.learningDay.createMany({ data: daysData });
    }

    return {
      pathId: path.id,
      currentLevel: path.currentLevel,
      currentDay: path.currentDay,
      totalDays: daysData.length,
    };
  }

  // ── B21.4: GET /learning/today ──────────────────────────────────────

  async getToday(userId: string) {
    const path = await this.getPathOrFail(userId);

    const day = await this.prisma.learningDay.findUnique({
      where: {
        pathId_dayNumber: {
          pathId: path.id,
          dayNumber: path.currentDay,
        },
      },
      include: {
        concept: true,
      },
    });

    if (!day) {
      throw new NotFoundException('No lesson available for today');
    }

    return {
      dayNumber: day.dayNumber,
      concept: {
        id: day.concept.id,
        slug: day.concept.slug,
        nameRu: day.concept.nameRu,
        description: day.concept.description,
        branch: day.concept.branch,
        category: day.concept.category,
      },
      cards: day.cards,
      completedAt: day.completedAt,
      metrics: day.metrics,
    };
  }

  // ── B21.5: GET /learning/status ─────────────────────────────────────

  async getStatus(userId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
      include: {
        days: {
          select: { dayNumber: true, completedAt: true },
          orderBy: { dayNumber: 'asc' },
        },
      },
    });

    if (!path) {
      return {
        hasPath: false,
        message: 'Пройди определение, чтобы начать свой путь.',
      };
    }

    const completedDays = path.days.filter((d) => d.completedAt != null).length;
    const totalDays = path.days.length;

    return {
      hasPath: true,
      pathId: path.id,
      currentLevel: path.currentLevel,
      currentLevelName: this.getLevelDisplayName(path.currentLevel),
      currentDay: path.currentDay,
      completedDays,
      totalDays,
      startZone: path.startZone,
      painPoint: path.painPoint,
      deliveryStyle: path.deliveryStyle,
      startedAt: path.startedAt,
    };
  }

  // ── B21.6: POST /learning/interact ──────────────────────────────────

  async interact(userId: string, dto: InteractDto) {
    const path = await this.getPathOrFail(userId);

    const day = await this.prisma.learningDay.findUnique({
      where: { id: dto.dayId },
    });

    if (!day || day.pathId !== path.id) {
      throw new NotFoundException('Learning day not found');
    }

    // Update metrics
    const currentMetrics = (day.metrics as Record<string, unknown> | null) ?? {};
    const prevInteractions = Array.isArray(currentMetrics.interactions)
      ? (currentMetrics.interactions as Record<string, unknown>[])
      : [];
    const interactions: Record<string, unknown>[] = [
      ...prevInteractions,
      {
        cardIndex: dto.cardIndex,
        type: dto.type,
        timeSpentMs: dto.timeSpentMs ?? 0,
        answer: dto.answer ?? null,
        timestamp: new Date().toISOString(),
      },
    ];

    await this.prisma.learningDay.update({
      where: { id: day.id },
      data: {
        metrics: JSON.parse(JSON.stringify({ ...currentMetrics, interactions })),
      },
    });

    return { recorded: true };
  }

  // ── B21.7: POST /learning/explain ───────────────────────────────────

  async gradeExplanation(userId: string, dto: ExplainDto) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: dto.conceptId },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    // AI grading of user's explanation
    const gradeResult = await this.ai.chatCompletion(
      [
        {
          role: 'system',
          content: `Ты — наставник платформы РАЗУМ. Оцени объяснение ученика по концепту "${concept.nameRu}".
Описание концепта: ${concept.description}

Оцени по шкале:
- "understood" — ученик уловил суть, объяснил своими словами
- "partial" — частично понял, упустил важное
- "missed" — не понял суть концепта

Ответь строго в JSON:
{
  "grade": "understood" | "partial" | "missed",
  "feedback": "краткий комментарий что именно уловил или упустил",
  "hints": ["подсказка что стоит обдумать"]
}`,
        },
        {
          role: 'user',
          content: dto.explanation,
        },
      ],
      { userId, operation: 'learning_grade_explanation' },
    );

    let parsed: { grade: string; feedback: string; hints: string[] };
    try {
      parsed = JSON.parse(gradeResult);
    } catch {
      parsed = { grade: 'partial', feedback: 'Не удалось оценить ответ автоматически.', hints: [] };
    }

    // Update mastery based on grade
    const masteryDelta = parsed.grade === 'understood' ? 0.15 : parsed.grade === 'partial' ? 0.05 : 0;
    const bloomDelta = parsed.grade === 'understood' ? 1 : 0;

    if (masteryDelta > 0) {
      await this.prisma.userConceptMastery.upsert({
        where: { userId_conceptId: { userId, conceptId: dto.conceptId } },
        update: {
          mastery: { increment: masteryDelta },
          bloomReached: { increment: bloomDelta },
          timesCorrect: { increment: parsed.grade === 'understood' ? 1 : 0 },
          timesWrong: { increment: parsed.grade === 'missed' ? 1 : 0 },
          lastTestedAt: new Date(),
        },
        create: {
          userId,
          conceptId: dto.conceptId,
          mastery: masteryDelta,
          bloomReached: bloomDelta,
          timesCorrect: parsed.grade === 'understood' ? 1 : 0,
          timesWrong: parsed.grade === 'missed' ? 1 : 0,
          lastTestedAt: new Date(),
        },
      });
    }

    return {
      grade: parsed.grade,
      feedback: parsed.feedback,
      hints: parsed.hints,
      conceptName: concept.nameRu,
    };
  }

  // ── B21.8: GET /learning/depth/:conceptId ───────────────────────────

  async getDepthLayers(userId: string, conceptId: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        depthLayers: true,
        relationsFrom: {
          include: { target: { select: { id: true, slug: true, nameRu: true } } },
        },
        relationsTo: {
          include: { source: { select: { id: true, slug: true, nameRu: true } } },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    // Get user mastery for this concept
    const mastery = await this.prisma.userConceptMastery.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    const layers = concept.depthLayers.reduce(
      (acc, layer) => {
        acc[layer.layerType] = {
          content: layer.content,
          sourceRef: layer.sourceRef,
        };
        return acc;
      },
      {} as Record<string, { content: unknown; sourceRef: string | null }>,
    );

    return {
      concept: {
        id: concept.id,
        slug: concept.slug,
        nameRu: concept.nameRu,
        description: concept.description,
        branch: concept.branch,
        category: concept.category,
      },
      mastery: mastery
        ? {
            level: mastery.mastery,
            bloomReached: mastery.bloomReached,
            lastTestedAt: mastery.lastTestedAt,
          }
        : null,
      layers,
      relations: {
        from: concept.relationsFrom.map((r) => ({
          type: r.relationType,
          concept: r.target,
        })),
        to: concept.relationsTo.map((r) => ({
          type: r.relationType,
          concept: r.source,
        })),
      },
    };
  }

  // ── B21.9: POST /learning/day/:dayNumber/complete ───────────────────

  async completeDay(userId: string, dayNumber: number) {
    const path = await this.getPathOrFail(userId);

    const day = await this.prisma.learningDay.findUnique({
      where: {
        pathId_dayNumber: {
          pathId: path.id,
          dayNumber,
        },
      },
    });

    if (!day) {
      throw new NotFoundException(`Day ${dayNumber} not found`);
    }

    if (day.completedAt) {
      throw new ConflictException(`Day ${dayNumber} already completed`);
    }

    if (dayNumber !== path.currentDay) {
      throw new BadRequestException(`You can only complete the current day (${path.currentDay})`);
    }

    // Mark day as completed
    await this.prisma.learningDay.update({
      where: { id: day.id },
      data: { completedAt: new Date() },
    });

    // Update mastery for the concept
    await this.prisma.userConceptMastery.upsert({
      where: { userId_conceptId: { userId, conceptId: day.conceptId } },
      update: {
        mastery: { increment: 0.1 },
        lastTestedAt: new Date(),
      },
      create: {
        userId,
        conceptId: day.conceptId,
        mastery: 0.1,
        lastTestedAt: new Date(),
      },
    });

    // Check if barrier is needed
    const nextDay = path.currentDay + 1;
    const barrierNeeded = this.isBarrierDay(nextDay);

    // Advance to next day
    await this.prisma.learningPath.update({
      where: { id: path.id },
      data: { currentDay: nextDay },
    });

    return {
      completedDay: dayNumber,
      nextDay,
      barrierNeeded,
      barrierLevel: barrierNeeded ? this.getBarrierLevel(nextDay) : null,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────

  private async getPathOrFail(userId: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
    });

    if (!path) {
      throw new NotFoundException('Learning path not found. Complete determination first.');
    }

    return path;
  }

  private analyzeDetermination(dto: DetermineDto) {
    // Map answers to branches/zones based on chosen options
    const branchScores: { [key: string]: number } = {
      STRATEGY: 0,
      LOGIC: 0,
      ERUDITION: 0,
      RHETORIC: 0,
      INTUITION: 0,
    };

    const branchMap: string[] = ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'];

    for (const answer of dto.answers) {
      const idx = answer.situationIndex - 1;
      const branch = branchMap[idx];
      if (branch != null && idx >= 0 && idx < branchMap.length) {
        branchScores[branch] = (branchScores[branch] ?? 0) + (3 - answer.chosenOption);
      }
    }

    // Find strongest and weakest branches
    const sorted = Object.entries(branchScores).sort((a, b) => b[1] - a[1]);
    const startZone = sorted[0]?.[0] ?? 'STRATEGY';
    const painPoint = sorted[sorted.length - 1]?.[0] ?? 'LOGIC';

    // Delivery style based on answer patterns
    const avgOption = dto.answers.reduce((s, a) => s + a.chosenOption, 0) / dto.answers.length;
    const deliveryStyle = avgOption < 1.5 ? 'analytical' : avgOption < 2.5 ? 'practical' : 'philosophical';

    return { startZone, painPoint, deliveryStyle };
  }

  private buildConceptOrder(
    concepts: Array<{ id: string; slug: string; nameRu: string; description: string; branch: string; difficulty: string; bloomLevel: number; relationsFrom: Array<{ targetId: string }> }>,
    startZone?: string | null,
  ) {
    // Simple topological sort with preference for startZone branch
    const sorted = [...concepts].sort((a, b) => {
      // Prioritize start zone branch
      if (startZone) {
        if (a.branch === startZone && b.branch !== startZone) return -1;
        if (b.branch === startZone && a.branch !== startZone) return 1;
      }
      // Then by difficulty
      const diffOrder = { BRONZE: 0, SILVER: 1, GOLD: 2 };
      const diffA = diffOrder[a.difficulty as keyof typeof diffOrder] ?? 0;
      const diffB = diffOrder[b.difficulty as keyof typeof diffOrder] ?? 0;
      if (diffA !== diffB) return diffA - diffB;
      // Then by bloom level
      return a.bloomLevel - b.bloomLevel;
    });

    return sorted;
  }

  private generateDefaultCards(concept: { nameRu: string; description: string; slug: string }) {
    return [
      { type: 'hook', content: { text: concept.nameRu } },
      { type: 'explanation', content: { text: concept.description } },
      { type: 'evidence', content: { text: '' } },
      { type: 'example', content: { text: '' } },
      { type: 'quiz', content: { question: '', options: [], correctIndex: 0, explanations: [] } },
      { type: 'explain', content: { prompt: `Объясни своими словами: ${concept.nameRu}` } },
      { type: 'thread', content: { yesterday: null, today: concept.nameRu, tomorrow: null } },
      { type: 'wisdom', content: { quote: '', author: '' } },
    ];
  }

  private isBarrierDay(dayNumber: number): boolean {
    // Barriers at day 5, 10, 15, 20, 25 (every 5 days)
    return dayNumber > 1 && (dayNumber - 1) % 5 === 0;
  }

  private getBarrierLevel(dayNumber: number): LevelName {
    const barrierIndex = Math.floor((dayNumber - 1) / 5);
    return LEVEL_ORDER[Math.min(barrierIndex, LEVEL_ORDER.length - 1)] ?? 'SLEEPING';
  }

  private getLevelDisplayName(level: LevelName): string {
    const names: Record<LevelName, string> = {
      SLEEPING: 'Спящий',
      AWAKENED: 'Пробудившийся',
      OBSERVER: 'Наблюдатель',
      WARRIOR: 'Воин',
      STRATEGIST: 'Стратег',
      MASTER: 'Мастер',
    };
    return names[level];
  }
}
