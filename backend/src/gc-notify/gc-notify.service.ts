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
import type {
  ITemplateResolver,
  ITemplateRendererRegistry,
  ISenderStore,
  StoredSender,
} from '../adapters/interfaces';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
  SENDER_STORE,
} from '../adapters/tokens';
import {
  DeliveryAdapterResolver,
  GC_NOTIFY_CLIENT,
} from '../common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../common/delivery-context/delivery-context.service';
import { GcNotifyApiClient } from './gc-notify-api.client';
import { InMemoryTemplateStore } from '../adapters/implementations/storage/in-memory/in-memory-template.store';
import type { StoredTemplate } from '../adapters/interfaces';
import { FileAttachment } from './v2/core/schemas';

@Injectable()
export class GcNotifyService {
  private readonly logger = new Logger(GcNotifyService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly templateStore: InMemoryTemplateStore,
    private readonly deliveryAdapterResolver: DeliveryAdapterResolver,
    private readonly deliveryContextService: DeliveryContextService,
    private readonly gcNotifyApiClient: GcNotifyApiClient,
    @Inject(TEMPLATE_RESOLVER)
    private readonly templateResolver: ITemplateResolver,
    @Inject(TEMPLATE_RENDERER_REGISTRY)
    private readonly rendererRegistry: ITemplateRendererRegistry,
    @Inject(DEFAULT_TEMPLATE_ENGINE) private readonly defaultEngine: string,
    @Inject(SENDER_STORE) private readonly senderStore: ISenderStore,
  ) {}

  getNotifications(query: {
    template_type?: 'sms' | 'email';
    status?: string[];
    reference?: string;
    older_than?: string;
    include_jobs?: boolean;
  }): Promise<{ notifications: Notification[]; links: Links }> {
    this.logger.log('Getting notifications list', { query });
    return Promise.resolve({
      notifications: [],
      links: { current: '/gc-notify/v2/notifications' },
    });
  }

  getNotificationById(notificationId: string): Promise<Notification> {
    this.logger.log(`Getting notification: ${notificationId}`);
    return Promise.reject(
      new NotFoundException('Notification not found in database'),
    );
  }

  async sendEmail(
    body: CreateEmailNotificationRequest,
    authHeader?: string,
  ): Promise<NotificationResponse> {
    const emailAdapter = this.deliveryAdapterResolver.getEmailAdapter();

    if (emailAdapter === GC_NOTIFY_CLIENT) {
      if (!authHeader) {
        throw new BadRequestException(
          'X-GC-Notify-Api-Key header is required when using GC Notify facade',
        );
      }
      return this.gcNotifyApiClient.sendEmail(body, authHeader);
    }

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

    const subject = body.subject ?? rendered.subject ?? defaultSubject;

    const sender = await this.resolveEmailSender(body.email_reply_to_id);
    const emailAdapterKey = this.deliveryContextService.getEmailAdapterKey();
    const fromEmail =
      sender?.email_address ??
      this.configService.get<string>(`${emailAdapterKey}.from`) ??
      this.configService.get<string>(
        'defaults.email.from',
        'noreply@localhost',
      );

    await emailAdapter.send({
      to: body.email_address,
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
    authHeader?: string,
  ): Promise<NotificationResponse> {
    const smsAdapter = this.deliveryAdapterResolver.getSmsAdapter();

    if (smsAdapter === GC_NOTIFY_CLIENT) {
      if (!authHeader) {
        throw new BadRequestException(
          'X-GC-Notify-Api-Key header is required when using GC Notify facade',
        );
      }
      return this.gcNotifyApiClient.sendSms(body, authHeader);
    }

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
    const engine = template.engine ?? this.defaultEngine;
    const renderer = this.rendererRegistry.getRenderer(engine);
    const rendered = await renderer.renderSms({
      template,
      personalisation,
    });

    const sender = await this.resolveSmsSender(body.sms_sender_id);
    const fromNumber =
      sender?.sms_sender ??
      this.configService.get<string>('twilio.fromNumber') ??
      this.configService.get<string>('defaults.sms.fromNumber', '+15551234567');

    await smsAdapter.send({
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
    if (senderId) {
      return this.senderStore.getById(senderId);
    }
    const defaultSender = this.senderStore
      .getAll()
      .find(
        (s) => (s.type === 'email' || s.type === 'email+sms') && s.is_default,
      );
    return defaultSender ?? null;
  }

  private async resolveSmsSender(
    senderId?: string,
  ): Promise<StoredSender | null> {
    if (senderId) {
      return this.senderStore.getById(senderId);
    }
    const defaultSender = this.senderStore
      .getAll()
      .find(
        (s) => (s.type === 'sms' || s.type === 'email+sms') && s.is_default,
      );
    return defaultSender ?? null;
  }

  sendBulk(body: PostBulkRequest): Promise<PostBulkResponse> {
    if (!body.rows && !body.csv) {
      return Promise.reject(
        new BadRequestException('You should specify either rows or csv'),
      );
    }

    const rowCount = body.rows
      ? body.rows.length - 1
      : (body.csv?.split('\n').length ?? 1) - 1;

    if (rowCount > 50000) {
      return Promise.reject(
        new BadRequestException(
          'Too many rows. Maximum number of rows allowed is 50000',
        ),
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

    return Promise.resolve({ data });
  }

  async getTemplates(
    type?: 'sms' | 'email',
    authHeader?: string,
  ): Promise<{ templates: Template[] }> {
    const emailKey = this.deliveryContextService.getEmailAdapterKey();
    const smsKey = this.deliveryContextService.getSmsAdapterKey();

    if ((emailKey === 'gc-notify' || smsKey === 'gc-notify') && authHeader) {
      return this.gcNotifyApiClient.getTemplates(type, authHeader);
    }

    this.logger.log('Getting templates list');
    let templates = this.templateStore.getAll();
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }
    return { templates };
  }

  async getTemplate(
    templateId: string,
    authHeader?: string,
  ): Promise<Template> {
    const emailKey = this.deliveryContextService.getEmailAdapterKey();
    const smsKey = this.deliveryContextService.getSmsAdapterKey();

    if ((emailKey === 'gc-notify' || smsKey === 'gc-notify') && authHeader) {
      return this.gcNotifyApiClient.getTemplate(templateId, authHeader);
    }

    this.logger.log(`Getting template: ${templateId}`);
    const template = await this.templateStore.getById(templateId);
    if (!template) {
      throw new NotFoundException('Template not found in database');
    }
    return template;
  }

  // --- Senders CRUD (Extension: Management) ---

  getSenders(
    type?: 'email' | 'sms' | 'email+sms',
  ): Promise<{ senders: Sender[] }> {
    this.logger.log('Getting senders list');
    let senders = this.senderStore.getAll();
    if (type) {
      senders = senders.filter(
        (s) => s.type === type || s.type === 'email+sms',
      );
    }
    return Promise.resolve({ senders });
  }

  async getSender(senderId: string): Promise<Sender> {
    this.logger.log(`Getting sender: ${senderId}`);
    const sender = await this.senderStore.getById(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }
    return sender;
  }

  createSender(body: CreateSenderRequest): Promise<Sender> {
    try {
      this.validateSenderFields(body);
    } catch (err) {
      return Promise.reject(
        err instanceof Error ? err : new Error(String(err)),
      );
    }
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
    this.senderStore.set(id, sender);
    this.logger.log(`Created sender: ${id}`);
    return Promise.resolve(sender);
  }

  async updateSender(
    senderId: string,
    body: UpdateSenderRequest,
  ): Promise<Sender> {
    const existing = await this.senderStore.getById(senderId);
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
    this.senderStore.set(senderId, updated);
    this.logger.log(`Updated sender: ${senderId}`);
    return updated;
  }

  deleteSender(senderId: string): Promise<void> {
    if (!this.senderStore.has(senderId)) {
      return Promise.reject(new NotFoundException('Sender not found'));
    }
    this.senderStore.delete(senderId);
    this.logger.log(`Deleted sender: ${senderId}`);
    return Promise.resolve();
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

  createTemplate(body: CreateTemplateRequest): Promise<Template> {
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
      engine: body.engine,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.templateStore.set(id, template);
    this.logger.log(`Created template: ${id}`);
    return Promise.resolve(template);
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

  deleteTemplate(templateId: string): Promise<void> {
    if (!this.templateStore.has(templateId)) {
      return Promise.reject(
        new NotFoundException('Template not found in database'),
      );
    }
    this.templateStore.delete(templateId);
    this.logger.log(`Deleted template: ${templateId}`);
    return Promise.resolve();
  }
}
