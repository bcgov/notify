import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailDto, SendSmsDto, NotificationResponseDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(dto: SendEmailDto): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating email notification: ${notificationId} to ${dto.to}`,
    );

    // TODO: Integrate with CHES provider
    // For now, return a mock response
    return {
      id: notificationId,
      reference: dto.reference,
      content: {
        body: `Email sent with template ${dto.template_id}`,
        subject: 'Notification',
        from_email: 'noreply@gov.bc.ca',
      },
      uri: `/v2/notifications/${notificationId}`,
      template: {
        id: dto.template_id,
        version: 1,
        uri: `/v2/templates/${dto.template_id}`,
      },
    };
  }

  async sendSms(dto: SendSmsDto): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating SMS notification: ${notificationId} to ${dto.phone_number}`,
    );

    // TODO: Integrate with Twilio provider
    // For now, return a mock response
    return {
      id: notificationId,
      reference: dto.reference,
      content: {
        body: `SMS sent with template ${dto.template_id}`,
        from_number:
          this.configService.get<string>('twilio.fromNumber') || '+15551234567',
      },
      uri: `/v2/notifications/${notificationId}`,
      template: {
        id: dto.template_id,
        version: 1,
        uri: `/v2/templates/${dto.template_id}`,
      },
    };
  }

  async getNotification(id: string): Promise<any> {
    this.logger.log(`Fetching notification: ${id}`);

    // TODO: Fetch from database
    // For now, return a mock status response
    throw new NotFoundException(`Notification ${id} not found`);
  }
}
