import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  SendEmailRequest,
  SendSmsRequest,
  SendNotificationResponse,
} from './v1/core/schemas';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly configService: ConfigService) {}

  sendEmail(body: SendEmailRequest): Promise<SendNotificationResponse> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating email notification: ${notificationId} to ${body.to}`,
    );

    // TODO(BCNOTIFY): Integrate with CHES provider when available
    return Promise.resolve({
      id: notificationId,
      reference: body.reference,
      content: {
        body: `Email sent with template ${body.template_id}`,
        subject: 'Notification',
        from_email: 'noreply@gov.bc.ca',
      },
      uri: `/v1/notifications/${notificationId}`,
      template: {
        id: body.template_id,
        version: 1,
        uri: `/v1/templates/${body.template_id}`,
      },
    });
  }

  sendSms(body: SendSmsRequest): Promise<SendNotificationResponse> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating SMS notification: ${notificationId} to ${body.phone_number}`,
    );

    // TODO(BCNOTIFY): Integrate with Twilio provider when available
    return Promise.resolve({
      id: notificationId,
      reference: body.reference,
      content: {
        body: `SMS sent with template ${body.template_id}`,
        from_number:
          this.configService.get<string>('twilio.fromNumber') || '+15551234567',
      },
      uri: `/v1/notifications/${notificationId}`,
      template: {
        id: body.template_id,
        version: 1,
        uri: `/v1/templates/${body.template_id}`,
      },
    });
  }

  getNotification(id: string): Promise<SendNotificationResponse> {
    this.logger.log(`Fetching notification: ${id}`);

    // TODO(BCNOTIFY): Fetch from database when persistence layer is added
    return Promise.reject(
      new NotFoundException(`Notification ${id} not found`),
    );
  }
}
