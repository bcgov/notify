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
  CreateEmailNotificationRequest,
  CreateSmsNotificationRequest,
  NotificationResponse,
  Notification,
  Template,
  Links,
  PostBulkRequest,
  PostBulkResponse,
  PostBulkJobData,
} from './v2/core/schemas';
import {
  Sender,
  CreateSenderRequest,
  UpdateSenderRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from './v2/contrib/schemas';
import type { IEmailTransport, ISmsTransport } from '../transports/interfaces';
import type {
  ITemplateResolver,
  ITemplateRenderer,
} from './transports/interfaces';
import { EMAIL_TRANSPORT, SMS_TRANSPORT } from '../transports/tokens';
import { TEMPLATE_RESOLVER, TEMPLATE_RENDERER } from './transports/tokens';
import { InMemoryTemplateStore } from './transports/in-memory-template.store';
import type { StoredTemplate } from './transports/in-memory-template.store';
import { FileAttachment } from './v2/core/schemas';

interface StoredSender extends Sender {
  id: string;
}

@Injectable()
export class GcNotifyService {
  private readonly logger = new Logger(GcNotifyService.name);

  private readonly senders = new Map<string, StoredSender>();

  constructor(
    private readonly configService: ConfigService,
    private readonly templateStore: InMemoryTemplateStore,
    @Inject(EMAIL_TRANSPORT) private readonly emailTransport: IEmailTransport,
    @Inject(SMS_TRANSPORT) private readonly smsTransport: ISmsTransport,
    @Inject(TEMPLATE_RESOLVER)
    private readonly templateResolver: ITemplateResolver,
    @Inject(TEMPLATE_RENDERER)
    private readonly templateRenderer: ITemplateRenderer,
  ) {}

  async getNotifications(query: {
    template_type?: 'sms' | 'email';
    status?: string[];
    reference?: string;
    older_than?: string;
    include_jobs?: boolean;
  }): Promise<{ notifications: Notification[]; links: Links }> {
    this.logger.log('Getting notifications list', { query });
    await Promise.resolve();
    return {
      notifications: [],
      links: { current: '/gc-notify/v2/notifications' },
    };
  }

  async getNotificationById(notificationId: string): Promise<Notification> {
    this.logger.log(`Getting notification: ${notificationId}`);
    await Promise.resolve();
    throw new NotFoundException('Notification not found in database');
  }

  async sendEmail(
    body: CreateEmailNotificationRequest,
  ): Promise<NotificationResponse> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating email notification: ${notificationId} to ${body.email_address}`,
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

    const personalisation = this.normalizePersonalisation(body.personalisation);
    const rendered = this.templateRenderer.renderEmail({
      template,
      personalisation,
    });

    const sender = await this.resolveEmailSender(body.email_reply_to_id);
    const fromEmail =
      sender?.email_address ??
      this.configService.get<string>('nodemailer.from', 'noreply@localhost');

    await this.emailTransport.send({
      to: body.email_address,
      subject: rendered.subject,
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
        subject: rendered.subject,
      },
      uri: `/gc-notify/v2/notifications/${notificationId}`,
      template: {
        id: body.template_id,
        version: 1,
        uri: `/gc-notify/v2/templates/${body.template_id}`,
      },
      scheduled_for: body.scheduled_for,
    };
  }

  async sendSms(
    body: CreateSmsNotificationRequest,
  ): Promise<NotificationResponse> {
    const notificationId = uuidv4();
    this.logger.log(
      `Creating SMS notification: ${notificationId} to ${body.phone_number}`,
    );

    const template = await this.templateResolver.getById(body.template_id);
    if (!template) {
      throw new NotFoundException(`Template ${body.template_id} not found`);
    }
    if (!template.active) {
      throw new BadRequestException(`Template ${body.template_id} is inactive`);
    }
    if (template.type !== 'sms') {
      throw new BadRequestException(
        `Template ${body.template_id} is not an SMS template`,
      );
    }

    const personalisation = body.personalisation ?? {};
    const rendered = this.templateRenderer.renderSms({
      template,
      personalisation,
    });

    const sender = await this.resolveSmsSender(body.sms_sender_id);
    const fromNumber =
      sender?.sms_sender ??
      this.configService.get<string>('twilio.fromNumber', '+15551234567');

    await this.smsTransport.send({
      to: body.phone_number,
      body: rendered.body,
      from: fromNumber,
    });

    return {
      id: notificationId,
      reference: body.reference,
      content: {
        body: rendered.body,
        from_number: fromNumber,
      },
      uri: `/gc-notify/v2/notifications/${notificationId}`,
      template: {
        id: body.template_id,
        version: 1,
        uri: `/gc-notify/v2/templates/${body.template_id}`,
      },
      scheduled_for: body.scheduled_for,
    };
  }

  private normalizePersonalisation(
    personalisation?: Record<string, string | FileAttachment>,
  ): Record<
    string,
    | string
    | { file: string; filename: string; sending_method: 'attach' | 'link' }
  > {
    if (!personalisation) return {};
    const result: Record<
      string,
      | string
      | { file: string; filename: string; sending_method: 'attach' | 'link' }
    > = {};
    for (const [key, value] of Object.entries(personalisation)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = {
          file: value.file,
          filename: value.filename,
          sending_method: value.sending_method,
        };
      }
    }
    return result;
  }

  private async resolveEmailSender(
    senderId?: string,
  ): Promise<StoredSender | null> {
    await Promise.resolve();
    if (senderId) {
      const sender = this.senders.get(senderId);
      return sender ?? null;
    }
    const defaultSender = Array.from(this.senders.values()).find(
      (s) => (s.type === 'email' || s.type === 'email+sms') && s.is_default,
    );
    return defaultSender ?? null;
  }

  private async resolveSmsSender(
    senderId?: string,
  ): Promise<StoredSender | null> {
    await Promise.resolve();
    if (senderId) {
      const sender = this.senders.get(senderId);
      return sender ?? null;
    }
    const defaultSender = Array.from(this.senders.values()).find(
      (s) => (s.type === 'sms' || s.type === 'email+sms') && s.is_default,
    );
    return defaultSender ?? null;
  }

  async sendBulk(body: PostBulkRequest): Promise<PostBulkResponse> {
    await Promise.resolve();
    if (!body.rows && !body.csv) {
      throw new BadRequestException('You should specify either rows or csv');
    }

    const rowCount = body.rows
      ? body.rows.length - 1
      : (body.csv?.split('\n').length ?? 1) - 1;

    if (rowCount > 50000) {
      throw new BadRequestException(
        'Too many rows. Maximum number of rows allowed is 50000',
      );
    }

    const jobId = uuidv4();
    this.logger.log(`Creating bulk job: ${jobId} with ${rowCount} recipients`);

    const now = new Date().toISOString();
    const data: PostBulkJobData = {
      id: jobId,
      template: body.template_id,
      job_status: 'pending',
      notification_count: rowCount,
      created_at: now,
    };

    return { data };
  }

  async getTemplates(
    type?: 'sms' | 'email',
  ): Promise<{ templates: Template[] }> {
    this.logger.log('Getting templates list');
    await Promise.resolve();
    let templates = this.templateStore.getAll();
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }
    return { templates };
  }

  async getTemplate(templateId: string): Promise<Template> {
    this.logger.log(`Getting template: ${templateId}`);
    const template = await this.templateStore.getById(templateId);
    if (!template) {
      throw new NotFoundException('Template not found in database');
    }
    return template;
  }

  // --- Senders CRUD (Extension: Management) ---

  async getSenders(
    type?: 'email' | 'sms' | 'email+sms',
  ): Promise<{ senders: Sender[] }> {
    this.logger.log('Getting senders list');
    await Promise.resolve();
    let senders = Array.from(this.senders.values());
    if (type) {
      senders = senders.filter(
        (s) => s.type === type || s.type === 'email+sms',
      );
    }
    return { senders };
  }

  async getSender(senderId: string): Promise<Sender> {
    this.logger.log(`Getting sender: ${senderId}`);
    await Promise.resolve();
    const sender = this.senders.get(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }
    return sender;
  }

  async createSender(body: CreateSenderRequest): Promise<Sender> {
    await Promise.resolve();
    this.validateSenderFields(body);
    const id = uuidv4();
    const now = new Date().toISOString();
    const sender: StoredSender = {
      id,
      type: body.type,
      email_address: body.email_address,
      sms_sender: body.sms_sender,
      is_default: body.is_default ?? false,
      created_at: now,
      updated_at: now,
    };
    this.senders.set(id, sender);
    this.logger.log(`Created sender: ${id}`);
    return sender;
  }

  async updateSender(
    senderId: string,
    body: UpdateSenderRequest,
  ): Promise<Sender> {
    await Promise.resolve();
    const existing = this.senders.get(senderId);
    if (!existing) {
      throw new NotFoundException('Sender not found');
    }
    const merged = { ...existing, ...body };
    this.validateSenderFields(merged as CreateSenderRequest);
    const updated: StoredSender = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString(),
    };
    this.senders.set(senderId, updated);
    this.logger.log(`Updated sender: ${senderId}`);
    return updated;
  }

  async deleteSender(senderId: string): Promise<void> {
    await Promise.resolve();
    if (!this.senders.has(senderId)) {
      throw new NotFoundException('Sender not found');
    }
    this.senders.delete(senderId);
    this.logger.log(`Deleted sender: ${senderId}`);
  }

  private validateSenderFields(body: CreateSenderRequest): void {
    if (body.type === 'email' || body.type === 'email+sms') {
      if (!body.email_address) {
        throw new BadRequestException(
          'email_address is required when type is email or email+sms',
        );
      }
    }
    if (body.type === 'sms' || body.type === 'email+sms') {
      if (!body.sms_sender) {
        throw new BadRequestException(
          'sms_sender is required when type is sms or email+sms',
        );
      }
    }
  }

  // --- Templates CRUD (Extension: Management) ---

  async createTemplate(body: CreateTemplateRequest): Promise<Template> {
    await Promise.resolve();
    const id = uuidv4();
    const now = new Date().toISOString();
    const template: StoredTemplate = {
      id,
      name: body.name,
      description: body.description,
      type: body.type,
      subject: body.subject,
      body: body.body,
      personalisation: body.personalisation,
      active: body.active ?? true,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.templateStore.set(id, template);
    this.logger.log(`Created template: ${id}`);
    return template;
  }

  async updateTemplate(
    templateId: string,
    body: UpdateTemplateRequest,
  ): Promise<Template> {
    const existing = await this.templateStore.getById(templateId);
    if (!existing) {
      throw new NotFoundException('Template not found in database');
    }
    const stored = existing;
    const updated: StoredTemplate = {
      ...stored,
      ...body,
      updated_at: new Date().toISOString(),
      version: stored.version + 1,
    };
    this.templateStore.set(templateId, updated);
    this.logger.log(`Updated template: ${templateId}`);
    return updated;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await Promise.resolve();
    if (!this.templateStore.has(templateId)) {
      throw new NotFoundException('Template not found in database');
    }
    this.templateStore.delete(templateId);
    this.logger.log(`Deleted template: ${templateId}`);
  }
}
