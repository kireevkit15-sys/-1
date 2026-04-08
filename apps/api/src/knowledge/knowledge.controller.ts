import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KnowledgeService } from './knowledge.service';

@ApiTags('Knowledge')
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @ApiOperation({ summary: 'Search similar knowledge chunks by text query' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query text' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default 5)' })
  @ApiQuery({ name: 'branch', required: false, enum: ['STRATEGY', 'LOGIC', 'ERUDITION', 'RHETORIC', 'INTUITION'] })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'minSimilarity', required: false, description: 'Min similarity threshold (default 0.3)' })
  @ApiResponse({ status: 200, description: 'Similar knowledge chunks' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('branch') branch?: 'STRATEGY' | 'LOGIC' | 'ERUDITION' | 'RHETORIC' | 'INTUITION',
    @Query('category') category?: string,
    @Query('minSimilarity') minSimilarity?: string,
  ) {
    return this.knowledgeService.searchSimilar(query, {
      limit: limit ? parseInt(limit, 10) : undefined,
      branch,
      category,
      minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined,
    });
  }

  @ApiOperation({ summary: 'Get knowledge base statistics' })
  @ApiResponse({ status: 200, description: 'Knowledge base stats' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats() {
    return this.knowledgeService.getStats();
  }
}
