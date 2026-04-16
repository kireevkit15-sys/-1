import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import type { LevelName } from '@prisma/client';
import {
  analyzeDetermination,
  buildLearningPath,
  computeEngagement,
  computeConceptConfidence,
  computeAdaptations,
  computeMasteryDelta,
} from '@razum/shared';
import type { ConceptNode, DeterminationResult, CardInteraction, AdaptationAction } from '@razum/shared';
import type { DetermineDto } from './dto/determine.dto';
import type { InteractDto } from './dto/interact.dto';
import type { ExplainDto } from './dto/explain.dto';
import { buildExplainGraderPrompt, parseExplainGraderResponse } from '../ai/prompts/explain-grader';

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
  private readonly logger = new Logger(LearningService.name);

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

    // L22.1: Use shared determination algorithm with cross-branch bonuses
    const result = analyzeDetermination(dto.answers);

    return {
      startZone: result.startZone,
      painPoint: result.painPoint,
      deliveryStyle: result.deliveryStyle,
      branchScores: result.branchScores,
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

    // L22.2: Build personal route using shared path builder with knowledge graph
    const rawConcepts = await this.prisma.concept.findMany({
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

    if (rawConcepts.length === 0) {
      throw new BadRequestException('No concepts available. Seed the database first.');
    }

    // Map to ConceptNode for shared algorithm
    const conceptNodes: ConceptNode[] = rawConcepts.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameRu: c.nameRu,
      branch: c.branch as ConceptNode['branch'],
      difficulty: c.difficulty as ConceptNode['difficulty'],
      bloomLevel: c.bloomLevel,
      prerequisiteIds: c.relationsFrom.map((r) => r.targetId),
    }));

    // Build determination result for path builder
    const det: DeterminationResult = determination
      ? analyzeDetermination([
          { situationIndex: 1, chosenOption: determination.startZone === 'STRATEGY' ? 0 : 2 },
          { situationIndex: 2, chosenOption: determination.startZone === 'LOGIC' ? 0 : 2 },
          { situationIndex: 3, chosenOption: determination.startZone === 'ERUDITION' ? 0 : 2 },
          { situationIndex: 4, chosenOption: determination.startZone === 'RHETORIC' ? 0 : 2 },
          { situationIndex: 5, chosenOption: determination.startZone === 'INTUITION' ? 0 : 2 },
        ])
      : analyzeDetermination([]);

    // Override with actual determination values if provided
    if (determination) {
      det.startZone = determination.startZone as DeterminationResult['startZone'];
      det.painPoint = determination.painPoint as DeterminationResult['painPoint'];
      det.deliveryStyle = determination.deliveryStyle as DeterminationResult['deliveryStyle'];
    }

    const orderedConcepts = buildLearningPath({ concepts: conceptNodes, determination: det });
    const conceptDescriptions = new Map(rawConcepts.map((c) => [c.id, { nameRu: c.nameRu, description: c.description, slug: c.slug }]));

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
    const daysData = orderedConcepts.slice(0, 30).map((concept, idx) => {
      const desc = conceptDescriptions.get(concept.id);
      return {
        pathId: path.id,
        dayNumber: idx + 1,
        conceptId: concept.id,
        cards: this.generateDefaultCards({
          nameRu: desc?.nameRu ?? concept.nameRu,
          description: desc?.description ?? '',
          slug: desc?.slug ?? concept.slug,
        }),
      };
    });

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

    // Fetch user's learning path for delivery style context
    const path = await this.prisma.learningPath.findUnique({
      where: { userId },
      select: { deliveryStyle: true },
    });

    // AI grading of user's explanation
    const systemPrompt = buildExplainGraderPrompt({
      conceptName: concept.nameRu,
      conceptDescription: concept.description ?? '',
      userExplanation: dto.explanation,
      deliveryStyle: path?.deliveryStyle ?? undefined,
      bloomLevel: concept.bloomLevel ?? undefined,
    });

    const gradeResult = await this.ai.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: dto.explanation },
      ],
      { userId, operation: 'learning_grade_explanation' },
    );

    const parsed = parseExplainGraderResponse(gradeResult);

    // Update mastery based on grade
    const masteryDelta = parsed.verdict === 'understood' ? 0.15 : parsed.verdict === 'partial' ? 0.05 : 0;
    const bloomDelta = parsed.verdict === 'understood' ? 1 : 0;

    if (masteryDelta > 0) {
      await this.prisma.userConceptMastery.upsert({
        where: { userId_conceptId: { userId, conceptId: dto.conceptId } },
        update: {
          mastery: { increment: masteryDelta },
          bloomReached: { increment: bloomDelta },
          timesCorrect: { increment: parsed.verdict === 'understood' ? 1 : 0 },
          timesWrong: { increment: parsed.verdict === 'missed' ? 1 : 0 },
          lastTestedAt: new Date(),
        },
        create: {
          userId,
          conceptId: dto.conceptId,
          mastery: masteryDelta,
          bloomReached: bloomDelta,
          timesCorrect: parsed.verdict === 'understood' ? 1 : 0,
          timesWrong: parsed.verdict === 'missed' ? 1 : 0,
          lastTestedAt: new Date(),
        },
      });
    }

    return {
      grade: parsed.verdict,
      score: parsed.score,
      feedback: parsed.feedback,
      missedPoints: parsed.missedPoints,
      strengths: parsed.strengths,
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

    // L22.4: Compute engagement and confidence from interaction metrics
    const dayMetrics = (day.metrics as Record<string, unknown> | null) ?? {};
    const interactions = Array.isArray(dayMetrics.interactions)
      ? (dayMetrics.interactions as CardInteraction[])
      : [];

    const cards = Array.isArray(day.cards) ? day.cards : [];
    const engagement = computeEngagement(interactions, cards.length);
    const confidence = computeConceptConfidence(day.conceptId, engagement);

    // L22.3: Dynamic mastery delta based on confidence (replaces fixed +0.1)
    const masteryDelta = computeMasteryDelta(confidence.confidence);

    await this.prisma.userConceptMastery.upsert({
      where: { userId_conceptId: { userId, conceptId: day.conceptId } },
      update: {
        mastery: { increment: masteryDelta },
        lastTestedAt: new Date(),
      },
      create: {
        userId,
        conceptId: day.conceptId,
        mastery: masteryDelta,
        lastTestedAt: new Date(),
      },
    });

    // L22.3: Run adaptation engine
    const recentDays = await this.prisma.learningDay.findMany({
      where: { pathId: path.id, completedAt: { not: null } },
      orderBy: { dayNumber: 'desc' },
      take: 5,
      select: { conceptId: true, metrics: true, cards: true },
    });

    const recentEngagements = recentDays.map((d) => {
      const m = (d.metrics as Record<string, unknown> | null) ?? {};
      const ints = Array.isArray(m.interactions) ? (m.interactions as CardInteraction[]) : [];
      const c = Array.isArray(d.cards) ? d.cards : [];
      return computeEngagement(ints, c.length);
    });

    const recentConfidences = recentDays.map((d, i) =>
      computeConceptConfidence(d.conceptId, recentEngagements[i]!),
    );

    const upcomingDays = await this.prisma.learningDay.findMany({
      where: { pathId: path.id, completedAt: null },
      select: { conceptId: true },
    });

    const concept = await this.prisma.concept.findUnique({
      where: { id: day.conceptId },
      select: { branch: true },
    });

    const adaptations = computeAdaptations({
      currentConfidence: confidence,
      currentEngagement: engagement,
      recentConfidences,
      recentEngagements,
      upcomingConceptIds: upcomingDays.map((d) => d.conceptId),
      currentBranch: (concept?.branch ?? 'STRATEGY') as ConceptNode['branch'],
      currentStyle: (path.deliveryStyle ?? 'practical') as DeterminationResult['deliveryStyle'],
      dayNumber,
    });

    // Apply style change if recommended
    const styleChange = adaptations.find((a): a is Extract<AdaptationAction, { type: 'CHANGE_STYLE' }> => a.type === 'CHANGE_STYLE');
    if (styleChange) {
      await this.prisma.learningPath.update({
        where: { id: path.id },
        data: { deliveryStyle: styleChange.newStyle },
      });
      this.logger.log(`Adaptation: changed delivery style to ${styleChange.newStyle} for user ${userId}`);
    }

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
      metrics: {
        confidence: confidence.confidence,
        engagement: confidence.engagement,
        masteryDelta,
        adaptations: adaptations.map((a) => a.type),
      },
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
