import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { GcNotifyService } from '../../gc-notify.service';
import { ApiKeyGuard } from '../../../common/guards';
import { Template } from '../core/schemas';
import {
  Sender,
  CreateSenderRequest,
  UpdateSenderRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  SendersListResponse,
} from './schemas';

const EXTENSION_DESCRIPTION =
  'Extension: Not part of the official GC Notify API.';

@ApiTags('GC Notify')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('gc-notify/v2')
export class GcNotifyManagementController {
  constructor(private readonly gcNotifyService: GcNotifyService) {}

  // --- Senders ---

  @Get('notifications/senders')
  @ApiOperation({
    summary: 'List senders',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['email', 'sms', 'email+sms'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved senders',
    type: SendersListResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSenders(@Query('type') type?: 'email' | 'sms' | 'email+sms') {
    return this.gcNotifyService.getSenders(type);
  }

  @Get('notifications/senders/:senderId')
  @ApiOperation({
    summary: 'Get sender by ID',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({
    status: 200,
    description: 'Sender retrieved successfully',
    type: Sender,
  })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  async getSender(@Param('senderId') senderId: string) {
    return this.gcNotifyService.getSender(senderId);
  }

  @Post('notifications/senders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create sender',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({
    status: 201,
    description: 'Sender created successfully',
    type: Sender,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createSender(@Body() body: CreateSenderRequest) {
    return this.gcNotifyService.createSender(body);
  }

  @Put('notifications/senders/:senderId')
  @ApiOperation({
    summary: 'Update sender',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({
    status: 200,
    description: 'Sender updated successfully',
    type: Sender,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  async updateSender(
    @Param('senderId') senderId: string,
    @Body() body: UpdateSenderRequest,
  ) {
    return this.gcNotifyService.updateSender(senderId, body);
  }

  @Delete('notifications/senders/:senderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete sender',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({ status: 204, description: 'Sender deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  async deleteSender(@Param('senderId') senderId: string) {
    await this.gcNotifyService.deleteSender(senderId);
  }

  // --- Templates ---

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create template',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: Template,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTemplate(@Body() body: CreateTemplateRequest) {
    return this.gcNotifyService.createTemplate(body);
  }

  @Put('template/:templateId')
  @ApiOperation({
    summary: 'Update template',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: Template,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() body: UpdateTemplateRequest,
  ) {
    return this.gcNotifyService.updateTemplate(templateId, body);
  }

  @Delete('template/:templateId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete template',
    description: EXTENSION_DESCRIPTION,
  })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(@Param('templateId') templateId: string) {
    await this.gcNotifyService.deleteTemplate(templateId);
  }
}
