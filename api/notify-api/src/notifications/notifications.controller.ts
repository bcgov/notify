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
import { NotificationsService } from './notifications.service';
import { SendEmailDto, SendSmsDto, NotificationResponseDto } from './dto';
import { ApiKeyGuard } from '../common/guards';

@ApiTags('Notifications')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('v2/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an email notification' })
  @ApiResponse({
    status: 201,
    description: 'Email notification created',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async sendEmail(@Body() dto: SendEmailDto): Promise<NotificationResponseDto> {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('sms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an SMS notification' })
  @ApiResponse({
    status: 201,
    description: 'SMS notification created',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid API key' })
  async sendSms(@Body() dto: SendSmsDto): Promise<NotificationResponseDto> {
    return this.notificationsService.sendSms(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification status by ID' })
  @ApiResponse({ status: 200, description: 'Notification details' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async getNotification(@Param('id') id: string) {
    return this.notificationsService.getNotification(id);
  }
}
