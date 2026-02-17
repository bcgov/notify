import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { NotificationsService } from '../../notifications.service';
import {
  SendEmailRequest,
  SendSmsRequest,
  SendNotificationResponse,
} from './schemas';
import { ApiKeyGuard } from '../../../common/guards';

@ApiTags('Notifications')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({
    status: 201,
    description: 'Email notification created',
    type: SendNotificationResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async sendEmail(
    @Body() body: SendEmailRequest,
  ): Promise<SendNotificationResponse> {
    return this.notificationsService.sendEmail(body);
  }

  @Post('sms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({
    status: 201,
    description: 'SMS notification created',
    type: SendNotificationResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async sendSms(@Body() body: SendSmsRequest): Promise<SendNotificationResponse> {
    return this.notificationsService.sendSms(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification status by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(
    @Param('id') id: string,
  ): Promise<SendNotificationResponse> {
    return this.notificationsService.getNotification(id);
  }
}
