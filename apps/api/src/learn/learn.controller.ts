import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { LearnService } from './learn.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import type { GetModulesQueryDto } from './dto/get-modules-query.dto';
import type { SubmitProgressDto } from './dto/submit-progress.dto';

@ApiTags('Learn')
@ApiBearerAuth()
@Controller('modules')
@UseGuards(JwtAuthGuard)
export class LearnController {
  constructor(private readonly learnService: LearnService) {}

  @Get()
  @ApiOperation({ summary: 'List modules by branch with user progress' })
  async getModules(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetModulesQueryDto,
  ) {
    return this.learnService.getModules(req.user.sub, query.branch);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get module detail with questions' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getModuleById(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.learnService.getModuleById(req.user.sub, id);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Mark a question as completed in a module' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async submitProgress(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitProgressDto,
  ) {
    return this.learnService.submitProgress(
      req.user.sub,
      id,
      body.questionId,
    );
  }
}
