import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  SendEmailRequest,
  SendSmsRequest,
  SendNotificationResponse,
} from './v1/core/schemas';
import type {
  ITemplateResolver,
  ITemplateRendererRegistry,
} from '../adapters/interfaces';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
} from '../adapters/tokens';
import {
  DeliveryAdapterResolver,
  GC_NOTIFY_CLIENT,
  CHES_PASSTHROUGH_CLIENT,
} from '../common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../common/delivery-context/delivery-context.service';
import { SendersService } from '../senders/senders.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly deliveryAdapterResolver: DeliveryAdapterResolver,
    private readonly deliveryContextService: DeliveryContextService,
    private readonly sendersService: SendersService,
    @Inject(TEMPLATE_RESOLVER)
    private readonly templateResolver: ITemplateResolver,
    @Inject(TEMPLATE_RENDERER_REGISTRY)
    private readonly rendererRegistry: ITemplateRendererRegistry,
    @Inject(DEFAULT_TEMPLATE_ENGINE) private readonly defaultEngine: string,
  ) {}

  async sendEmail(body: SendEmailRequest): Promise<SendNotificationResponse> {
    const emailAdapter = this.deliveryAdapterResolver.getEmailAdapter();

    if (
      emailAdapter === GC_NOTIFY_CLIENT ||
      emailAdapter === CHES_PASSTHROUGH_CLIENT
    ) {
      throw new BadRequestException(
        'Universal API supports only nodemailer and ches adapters. Use X-Delivery-Email-Adapter: nodemailer or ches.',
      );
    }

    const notificationId = uuidv4();
    this.logger.log(
      `Creating email notification: ${notificationId} to ${body.to}`,
    );

    const template = await this.templateResolver.getById(body.template_id);
    if (!template) {
      throw new NotFoundException(`Template ${body.template_id} not found`);
    }
    if (!template.active) {
      throw new BadRequestException(`Template ${body.template_id} is inactive`);
    }
    if (template.type !== 'email') {
      throw new BadRequestException(
        `Template ${body.template_id} is not an email template`,
      );
    }

    const personalisation = body.personalisation ?? {};
    const defaultSubject = this.configService.get<string>(
      'defaults.templates.defaultSubject',
      'Notification',
    );
    const engine = template.engine ?? this.defaultEngine;
    const renderer = this.rendererRegistry.getRenderer(engine);
    const rendered = await renderer.renderEmail({
      template,
      personalisation,
      defaultSubject,
    });

    const subject = rendered.subject ?? defaultSubject;

    const sender = body.reply_to_id
      ? await this.sendersService.findById(body.reply_to_id)
      : this.sendersService.getDefaultSender('email');
    if (body.reply_to_id && !sender) {
      throw new NotFoundException(`Sender ${body.reply_to_id} not found`);
    }
    const emailAdapterKey = this.deliveryContextService.getEmailAdapterKey();
    const fromEmail =
      sender?.email_address ??
      this.configService.get<string>(`${emailAdapterKey}.from`) ??
      this.configService.get<string>(
        'defaults.email.from',
        'noreply@localhost',
      );

    await emailAdapter.send({
      to: body.to,
      subject,
      body: rendered.body,
      from: fromEmail,
      replyTo: sender?.email_address,
      attachments: rendered.attachments,
    });

    return {
      id: notificationId,
      reference: body.reference,
      content: {
        from_email: fromEmail,
        body: rendered.body,
        subject,
      },
      uri: `/v1/notifications/${notificationId}`,
      template: {
        id: body.template_id,
        version: 1,
        uri: `/v1/templates/${body.template_id}`,
      },
    };
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
