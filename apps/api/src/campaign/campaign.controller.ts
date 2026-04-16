import {
  Controller,
  Get,
  Post,
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
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/strategies/jwt.strategy';
import { CampaignService } from './campaign.service';
import { GetCampaignsQueryDto } from './dto/get-campaigns-query.dto';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @ApiOperation({ summary: 'List all campaigns with user progress and unlock status' })
  @ApiOkResponse({ description: 'List of campaigns with progress info' })
  @ApiUnauthorizedResponse({ description: 'Not authorized' })
  @Get()
  async getCampaigns(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetCampaignsQueryDto,
  ) {
    return this.campaignService.getCampaigns(req.user.sub, query.branch);
  }

  @ApiOperation({ summary: 'Get user\'s active (in-progress) campaigns' })
  @ApiOkResponse({ description: 'List of active campaigns with progress' })
  @ApiUnauthorizedResponse({ description: 'Not authorized' })
  @Get('active')
  async getActiveCampaigns(
    @Request() req: AuthenticatedRequest,
  ) {
    return this.campaignService.getActiveCampaigns(req.user.sub);
  }

  @ApiOperation({ summary: 'Get full campaign detail with cards for current day' })
  @ApiOkResponse({ description: 'Campaign detail with current day cards' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiForbiddenResponse({ description: 'Campaign is locked (prerequisites not met)' })
  @ApiUnauthorizedResponse({ description: 'Not authorized' })
  @Get(':id')
  async getCampaignById(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.getCampaignById(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Start a campaign (max 2 active campaigns)' })
  @ApiOkResponse({ description: 'Campaign started successfully' })
  @ApiBadRequestResponse({ description: 'Max active campaigns reached or campaign already started' })
  @ApiForbiddenResponse({ description: 'Campaign is locked (prerequisites not met)' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiUnauthorizedResponse({ description: 'Not authorized' })
  @Post(':id/start')
  async startCampaign(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.startCampaign(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Advance to next day in campaign (all current day cards must be completed)' })
  @ApiOkResponse({ description: 'Advanced to next day or campaign completed' })
  @ApiBadRequestResponse({ description: 'Not all cards for current day are completed' })
  @ApiNotFoundResponse({ description: 'Campaign not found or not started' })
  @ApiUnauthorizedResponse({ description: 'Not authorized' })
  @Post(':id/advance')
  async advanceDay(
    @Request() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.advanceDay(req.user.sub, id);
  }
}
