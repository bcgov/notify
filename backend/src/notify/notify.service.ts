import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import type {
  IEmailTransport,
  ITemplateResolver,
  ITemplateRendererRegistry,
  TemplateDefinition,
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
import { IdentitiesService } from '../identities/identities.service';
import { NotifyTypesService } from '../notify-types/notify-types.service';
import { DefaultsService } from '../defaults/defaults.service';
import type {
  NotifyRequest,
  NotifyResponse,
  MessageAssociation,
} from './v1/core/schemas';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);
  private static readonly INLINE_TEMPLATE_ID =
    '00000000-0000-4000-8000-000000000001';

  constructor(
    private readonly configService: ConfigService,
    private readonly deliveryAdapterResolver: DeliveryAdapterResolver,
    private readonly deliveryContextService: DeliveryContextService,
    private readonly identitiesService: IdentitiesService,
    private readonly notifyTypesService: NotifyTypesService,
    private readonly defaultsService: DefaultsService,
    @Inject(TEMPLATE_RESOLVER)
    private readonly templateResolver: ITemplateResolver,
    @Inject(TEMPLATE_RENDERER_REGISTRY)
    private readonly rendererRegistry: ITemplateRendererRegistry,
    @Inject(DEFAULT_TEMPLATE_ENGINE) private readonly defaultEngine: string,
  ) {}

  async send(body: NotifyRequest): Promise<NotifyResponse> {
    const emailAdapter = this.deliveryAdapterResolver.getEmailAdapter();
    if (
      emailAdapter === GC_NOTIFY_CLIENT ||
      emailAdapter === CHES_PASSTHROUGH_CLIENT
    ) {
      throw new BadRequestException(
        'Notify API supports only nodemailer and ches adapters. Use X-Delivery-Email-Adapter: nodemailer or ches.',
      );
    }

    if (this.wantsInlineEmail(body)) {
      return this.sendInlineEmail(body, emailAdapter);
    }

    if (!body.notifyType?.trim()) {
      throw new BadRequestException(
        'notifyType is required unless sending inline email (override.common.subject, body, renderer with NOTIFY_INLINE_EMAIL_ENABLED).',
      );
    }

    const nt = this.notifyTypesService.getByCode(body.notifyType);
    if (!nt) {
      throw new NotFoundException(`Notify type "${body.notifyType}" not found`);
    }

    const defaults = this.defaultsService.getDefaults();
    const override = body.override ?? {};
    const common = override.common ?? {};
    const emailOverride = override.email ?? {};

    const to = common.to ?? [];
    const templateId = common.templateId ?? nt.templateId;
    const params = { ...(nt.params ?? {}), ...(common.params ?? {}) };
    const sendAs = common.sendAs ?? nt.sendAs ?? 'email';
    const emailIdentityId =
      emailOverride.emailIdentityId ??
      nt.identityId ??
      defaults.emailIdentityId;

    if (sendAs !== 'email') {
      throw new BadRequestException(
        'Only sendAs: email is implemented. Use override.common.sendAs: email.',
      );
    }
    if (to.length !== 1) {
      throw new BadRequestException(
        'Single email only: override.common.to must have exactly one recipient',
      );
    }
    if (!templateId) {
      throw new BadRequestException(
        'override.common.templateId or notifyType.templateId is required',
      );
    }

    const notifyId = uuidv4();
    const txId = uuidv4();
    const msgId = uuidv4();
    this.logger.log(`Notify send: ${notifyId} to ${to[0]}`);

    const template = await this.templateResolver.getById(templateId);
    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }
    if (!template.active) {
      throw new BadRequestException(`Template ${templateId} is inactive`);
    }
    if (template.type !== 'email') {
      throw new BadRequestException(
        `Template ${templateId} is not an email template`,
      );
    }

    const defaultSubject = this.configService.get<string>(
      'defaults.templates.defaultSubject',
      'Notification',
    );
    const engine = template.engine ?? common.renderer ?? this.defaultEngine;
    let renderer;
    try {
      renderer = this.rendererRegistry.getRenderer(engine);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Unknown template renderer',
      );
    }
    const rendered = await renderer.renderEmail({
      template,
      personalisation: params,
      defaultSubject,
    });
    const subject = rendered.subject ?? defaultSubject;

    const identity = emailIdentityId
      ? await this.identitiesService.findById(emailIdentityId)
      : this.identitiesService.getDefaultIdentity('email');
    if (emailIdentityId && !identity) {
      throw new NotFoundException(`Identity ${emailIdentityId} not found`);
    }
    const emailAdapterKey = this.deliveryContextService.getEmailAdapterKey();
    const fromEmail =
      identity?.email_address ??
      this.configService.get<string>(`${emailAdapterKey}.from`) ??
      this.configService.get<string>(
        'defaults.email.from',
        'noreply@localhost',
      );

    await emailAdapter.send({
      to: to[0],
      subject,
      body: rendered.body,
      from: fromEmail,
      replyTo: identity?.email_address,
      attachments: rendered.attachments,
    });

    const messages: MessageAssociation[] = [{ msgId, channel: 'email', to }];
    return {
      notifyId,
      txId,
      messages,
    };
  }

  private wantsInlineEmail(body: NotifyRequest): boolean {
    if (this.configService.get<boolean>('notify.inlineEmailEnabled') !== true) {
      return false;
    }
    const common = body.override?.common;
    if (!common) {
      return false;
    }
    const to = common.to ?? [];
    if (to.length !== 1) {
      return false;
    }
    const sendAs = common.sendAs ?? 'email';
    if (sendAs !== 'email') {
      return false;
    }
    return (
      this.nonEmptyTrimmed(common.subject) &&
      this.nonEmptyTrimmed(common.body) &&
      this.nonEmptyTrimmed(common.renderer)
    );
  }

  private nonEmptyTrimmed(value: string | undefined): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private async sendInlineEmail(
    body: NotifyRequest,
    emailAdapter: IEmailTransport,
  ): Promise<NotifyResponse> {
    const override = body.override ?? {};
    const common = override.common ?? {};
    const emailOverride = override.email ?? {};
    const to = common.to ?? [];
    const defaults = this.defaultsService.getDefaults();
    const emailIdentityId =
      emailOverride.emailIdentityId ?? defaults.emailIdentityId;

    if (to.length !== 1) {
      throw new BadRequestException(
        'Single email only: override.common.to must have exactly one recipient',
      );
    }

    const subjectRaw = common.subject!.trim();
    const bodyRaw = common.body!.trim();
    const rendererName = common.renderer!.trim();

    const syntheticTemplate: TemplateDefinition = {
      id: NotifyService.INLINE_TEMPLATE_ID,
      type: 'email',
      name: 'inline-notify',
      subject: subjectRaw,
      body: bodyRaw,
      active: true,
      engine: rendererName,
    };

    const defaultSubject = this.configService.get<string>(
      'defaults.templates.defaultSubject',
      'Notification',
    );

    let renderer;
    try {
      renderer = this.rendererRegistry.getRenderer(rendererName);
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Unknown template renderer',
      );
    }

    const params = { ...(common.params ?? {}) };
    const outputType =
      common.bodyType === 'text' ? ('text' as const) : ('html' as const);

    const rendered = await renderer.renderEmail(
      {
        template: syntheticTemplate,
        personalisation: params,
        defaultSubject,
      },
      { outputType },
    );
    const subject = rendered.subject ?? defaultSubject;

    const notifyId = uuidv4();
    const txId = uuidv4();
    const msgId = uuidv4();
    this.logger.log(`Notify inline send: ${notifyId} to ${to[0]}`);

    const identity = emailIdentityId
      ? await this.identitiesService.findById(emailIdentityId)
      : this.identitiesService.getDefaultIdentity('email');
    if (emailIdentityId && !identity) {
      throw new NotFoundException(`Identity ${emailIdentityId} not found`);
    }
    const emailAdapterKey = this.deliveryContextService.getEmailAdapterKey();
    const fromEmail =
      identity?.email_address ??
      this.configService.get<string>(`${emailAdapterKey}.from`) ??
      this.configService.get<string>(
        'defaults.email.from',
        'noreply@localhost',
      );

    await emailAdapter.send({
      to: to[0],
      subject,
      body: rendered.body,
      from: fromEmail,
      replyTo: identity?.email_address,
      attachments: rendered.attachments,
    });

    const messages: MessageAssociation[] = [{ msgId, channel: 'email', to }];
    return {
      notifyId,
      txId,
      messages,
    };
  }
}
