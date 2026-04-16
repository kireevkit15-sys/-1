import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ConceptService } from './concept.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import { GetConceptsQueryDto } from './dto/concepts-query.dto';

@ApiTags('Concepts')
@ApiBearerAuth()
@Controller('concepts')
@UseGuards(JwtAuthGuard)
export class ConceptController {
  constructor(private readonly conceptService: ConceptService) {}

  @Get()
  @ApiOperation({ summary: 'List concepts with filters (branch, category, difficulty, mastery, search)' })
  async getConcepts(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetConceptsQueryDto,
  ) {
    return this.conceptService.getConcepts(req.user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get concept details — description, relations, depth layers, mastery, questions' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getConceptById(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conceptService.getConceptById(req.user.sub, id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related concepts with relation types and user mastery' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getRelated(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.conceptService.getRelated(req.user.sub, id);
  }
}
