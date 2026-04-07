import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
let OpenAI: any;
try { OpenAI = require('openai').default; } catch { OpenAI = null; }

export interface SimilarChunk {
  id: string;
  content: string;
  source: string;
  category: string;
  topic: string;
  branch: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly openai: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    if (OpenAI) {
      this.openai = new OpenAI({
        apiKey: this.config.get<string>('OPENAI_API_KEY'),
      });
    } else {
      this.logger.warn('OpenAI package not installed — knowledge search disabled');
      this.openai = null;
    }
  }

  /**
   * Search for similar knowledge chunks using vector similarity.
   * Generates an embedding for the query, then finds nearest neighbors in pgvector.
   */
  async searchSimilar(
    query: string,
    options: {
      limit?: number;
      branch?: 'STRATEGY' | 'LOGIC';
      category?: string;
      minSimilarity?: number;
    } = {},
  ): Promise<SimilarChunk[]> {
    const { limit = 5, branch, category, minSimilarity = 0.3 } = options;

    this.logger.log(
      `searchSimilar: query="${query.slice(0, 50)}..." limit=${limit} branch=${branch ?? 'any'}`,
    );

    // Generate embedding for the query
    const embedding = await this.generateEmbedding(query);

    // Build WHERE clause filters
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 2; // $1 is the vector

    if (branch) {
      conditions.push(`branch = $${paramIndex}::"Branch"`);
      params.push(branch);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Cosine similarity search via pgvector
    const vectorStr = `[${embedding.join(',')}]`;

    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        source: string;
        category: string;
        topic: string;
        branch: string;
        metadata: Record<string, unknown>;
        similarity: number;
      }>
    >(
      `SELECT id, content, source, category, topic, branch, metadata,
              1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_chunks
       ${whereClause}
       AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT ${limit}`,
      vectorStr,
      ...params,
    );

    // Filter by minimum similarity
    const filtered = results.filter((r) => r.similarity >= minSimilarity);

    this.logger.log(
      `searchSimilar: found ${results.length} results, ${filtered.length} above threshold ${minSimilarity}`,
    );

    return filtered;
  }

  /**
   * Find chunks related to a specific topic or concept.
   */
  async findByTopic(
    topic: string,
    options: { branch?: 'STRATEGY' | 'LOGIC'; limit?: number } = {},
  ): Promise<SimilarChunk[]> {
    return this.searchSimilar(topic, {
      limit: options.limit ?? 10,
      branch: options.branch,
      minSimilarity: 0.2,
    });
  }

  /**
   * Get context for question generation — retrieves relevant knowledge chunks
   * that can be used as context for generating quiz questions.
   */
  async getContextForQuestion(
    topic: string,
    branch: 'STRATEGY' | 'LOGIC',
    count: number = 3,
  ): Promise<string> {
    const chunks = await this.searchSimilar(topic, {
      limit: count,
      branch,
      minSimilarity: 0.25,
    });

    if (chunks.length === 0) {
      return '';
    }

    return chunks
      .map(
        (c, i) =>
          `--- Источник ${i + 1}: ${c.source} (similarity: ${c.similarity.toFixed(2)}) ---\n${c.content}`,
      )
      .join('\n\n');
  }

  /**
   * Get statistics about the knowledge base.
   */
  async getStats(): Promise<{
    totalChunks: number;
    withEmbeddings: number;
    byBranch: Record<string, number>;
    byCategory: Record<string, number>;
    sources: string[];
  }> {
    const [totalResult, embeddedResult, branchResult, categoryResult, sourceResult] =
      await Promise.all([
        this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT count(*) FROM knowledge_chunks`,
        this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT count(*) FROM knowledge_chunks WHERE embedding IS NOT NULL`,
        this.prisma.$queryRaw<Array<{ branch: string; count: bigint }>>`
          SELECT branch, count(*) FROM knowledge_chunks GROUP BY branch`,
        this.prisma.$queryRaw<Array<{ category: string; count: bigint }>>`
          SELECT category, count(*) FROM knowledge_chunks GROUP BY category ORDER BY count DESC`,
        this.prisma.$queryRaw<Array<{ source: string }>>`
          SELECT DISTINCT source FROM knowledge_chunks ORDER BY source`,
      ]);

    const byBranch: Record<string, number> = {};
    for (const r of branchResult) {
      byBranch[r.branch] = Number(r.count);
    }

    const byCategory: Record<string, number> = {};
    for (const r of categoryResult) {
      byCategory[r.category] = Number(r.count);
    }

    return {
      totalChunks: Number(totalResult[0].count),
      withEmbeddings: Number(embeddedResult[0].count),
      byBranch,
      byCategory,
      sources: sourceResult.map((r) => r.source),
    };
  }

  // ── Private ───────────────────────────────────────────────────────

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    const first = response.data[0];
    if (!first) {
      throw new Error('Empty embedding response');
    }
    return first.embedding;
  }
}
