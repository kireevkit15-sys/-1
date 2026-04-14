import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type { GetConceptsQueryDto } from './dto/concepts-query.dto';

@Injectable()
export class ConceptService {
  constructor(private readonly prisma: PrismaService) {}

  // ── B23.1: GET /concepts ────────────────────────────────────────────

  async getConcepts(userId: string, query: GetConceptsQueryDto) {
    const where: Prisma.ConceptWhereInput = {};

    if (query.branch) where.branch = query.branch;
    if (query.category) where.category = query.category;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.search) {
      where.OR = [
        { nameRu: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    const [concepts, total] = await Promise.all([
      this.prisma.concept.findMany({
        where,
        orderBy: [{ branch: 'asc' }, { category: 'asc' }, { bloomLevel: 'asc' }],
        take: limit,
        skip: offset,
        include: {
          userMasteries: {
            where: { userId },
            select: { mastery: true, bloomReached: true, lastTestedAt: true },
          },
        },
      }),
      this.prisma.concept.count({ where }),
    ]);

    let items = concepts.map((c) => {
      const m = c.userMasteries[0];
      return {
        id: c.id,
        slug: c.slug,
        nameRu: c.nameRu,
        branch: c.branch,
        category: c.category,
        difficulty: c.difficulty,
        bloomLevel: c.bloomLevel,
        mastery: m?.mastery ?? 0,
        bloomReached: m?.bloomReached ?? 0,
        lastTestedAt: m?.lastTestedAt ?? null,
      };
    });

    // Filter by mastery level if requested
    if (query.masteryFilter) {
      items = items.filter((item) => {
        if (query.masteryFilter === 'unlearned') return item.mastery === 0;
        if (query.masteryFilter === 'partial') return item.mastery > 0 && item.mastery < 0.8;
        if (query.masteryFilter === 'mastered') return item.mastery >= 0.8;
        return true;
      });
    }

    return { items, total, limit, offset };
  }

  // ── B23.2: GET /concepts/:id ────────────────────────────────────────

  async getConceptById(userId: string, conceptId: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        depthLayers: true,
        userMasteries: {
          where: { userId },
        },
        relationsFrom: {
          include: {
            target: { select: { id: true, slug: true, nameRu: true, branch: true } },
          },
        },
        relationsTo: {
          include: {
            source: { select: { id: true, slug: true, nameRu: true, branch: true } },
          },
        },
        questions: {
          include: {
            question: { select: { id: true, text: true, difficulty: true } },
          },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    const mastery = concept.userMasteries[0];

    return {
      id: concept.id,
      slug: concept.slug,
      nameRu: concept.nameRu,
      description: concept.description,
      branch: concept.branch,
      category: concept.category,
      subcategory: concept.subcategory,
      bloomLevel: concept.bloomLevel,
      difficulty: concept.difficulty,
      sourceFile: concept.sourceFile,
      mastery: mastery
        ? {
            level: mastery.mastery,
            bloomReached: mastery.bloomReached,
            timesCorrect: mastery.timesCorrect,
            timesWrong: mastery.timesWrong,
            lastTestedAt: mastery.lastTestedAt,
            nextReviewAt: mastery.nextReviewAt,
          }
        : null,
      depthLayers: concept.depthLayers.map((l) => ({
        type: l.layerType,
        content: l.content,
        sourceRef: l.sourceRef,
      })),
      relations: {
        from: concept.relationsFrom.map((r) => ({
          type: r.relationType,
          strength: r.strength,
          concept: r.target,
        })),
        to: concept.relationsTo.map((r) => ({
          type: r.relationType,
          strength: r.strength,
          concept: r.source,
        })),
      },
      questions: concept.questions.map((cq) => cq.question),
    };
  }

  // ── B23.3: GET /concepts/:id/related ────────────────────────────────

  async getRelated(userId: string, conceptId: string) {
    const concept = await this.prisma.concept.findUnique({
      where: { id: conceptId },
      select: { id: true, nameRu: true },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    const [relationsFrom, relationsTo] = await Promise.all([
      this.prisma.conceptRelation.findMany({
        where: { sourceId: conceptId },
        include: {
          target: {
            include: {
              userMasteries: { where: { userId }, select: { mastery: true } },
            },
          },
        },
      }),
      this.prisma.conceptRelation.findMany({
        where: { targetId: conceptId },
        include: {
          source: {
            include: {
              userMasteries: { where: { userId }, select: { mastery: true } },
            },
          },
        },
      }),
    ]);

    const related = [
      ...relationsFrom.map((r) => ({
        direction: 'outgoing' as const,
        relationType: r.relationType,
        strength: r.strength,
        concept: {
          id: r.target.id,
          slug: r.target.slug,
          nameRu: r.target.nameRu,
          branch: r.target.branch,
          category: r.target.category,
          mastery: r.target.userMasteries[0]?.mastery ?? 0,
        },
      })),
      ...relationsTo.map((r) => ({
        direction: 'incoming' as const,
        relationType: r.relationType,
        strength: r.strength,
        concept: {
          id: r.source.id,
          slug: r.source.slug,
          nameRu: r.source.nameRu,
          branch: r.source.branch,
          category: r.source.category,
          mastery: r.source.userMasteries[0]?.mastery ?? 0,
        },
      })),
    ];

    return {
      conceptId,
      conceptName: concept.nameRu,
      related,
      totalRelations: related.length,
    };
  }

  // ── B23.4: GET /learning/mastery ────────────────────────────────────

  async getMasteryMap(userId: string) {
    const allConcepts = await this.prisma.concept.findMany({
      orderBy: [{ branch: 'asc' }, { category: 'asc' }],
      select: {
        id: true,
        slug: true,
        nameRu: true,
        branch: true,
        category: true,
        difficulty: true,
        userMasteries: {
          where: { userId },
          select: { mastery: true, bloomReached: true, lastTestedAt: true },
        },
      },
    });

    const totalConcepts = allConcepts.length;
    let masteredCount = 0;
    let partialCount = 0;
    let unlearnedCount = 0;

    const branchStats: Record<string, { total: number; mastered: number; avgMastery: number }> = {};

    const map = allConcepts.map((c) => {
      const m = c.userMasteries[0];
      const mastery = m?.mastery ?? 0;

      if (mastery >= 0.8) masteredCount++;
      else if (mastery > 0) partialCount++;
      else unlearnedCount++;

      // Branch stats
      if (!branchStats[c.branch]) {
        branchStats[c.branch] = { total: 0, mastered: 0, avgMastery: 0 };
      }
      const bs = branchStats[c.branch]!;
      bs.total++;
      if (mastery >= 0.8) bs.mastered++;
      bs.avgMastery += mastery;

      return {
        id: c.id,
        slug: c.slug,
        nameRu: c.nameRu,
        branch: c.branch,
        category: c.category,
        difficulty: c.difficulty,
        mastery,
        bloomReached: m?.bloomReached ?? 0,
        lastTestedAt: m?.lastTestedAt ?? null,
      };
    });

    // Finalize branch averages
    for (const branch of Object.keys(branchStats)) {
      const stats = branchStats[branch];
      if (stats && stats.total > 0) {
        stats.avgMastery = stats.avgMastery / stats.total;
      }
    }

    return {
      totalConcepts,
      masteredCount,
      partialCount,
      unlearnedCount,
      overallMastery: totalConcepts > 0 ? (masteredCount / totalConcepts) : 0,
      branchStats,
      concepts: map,
    };
  }
}
