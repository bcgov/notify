import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SendEmailDto, SendSmsDto, NotificationResponseDto } from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  sendEmail(dto: SendEmailDto): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating email notification: ${notificationId} to ${dto.to}`,
    );

    // TODO(BCNOTIFY): Integrate with CHES provider when available
    return Promise.resolve({
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
    });
  }

  sendSms(dto: SendSmsDto): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating SMS notification: ${notificationId} to ${dto.phone_number}`,
    );

    // TODO(BCNOTIFY): Integrate with Twilio provider when available
    return Promise.resolve({
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
    });
  }

  getNotification(id: string): Promise<NotificationResponseDto> {
    this.logger.log(`Fetching notification: ${id}`);

    // TODO(BCNOTIFY): Fetch from database when persistence layer is added
    return Promise.reject(
      new NotFoundException(`Notification ${id} not found`),
    );
  }
}
