import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../../src/notifications/notifications.service';
import {
  DeliveryAdapterResolver,
  GC_NOTIFY_CLIENT,
} from '../../src/common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../../src/common/delivery-context/delivery-context.service';
import { SendersService } from '../../src/senders/senders.service';
import { InMemoryTemplateStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-template.store';
import { InMemoryTemplateResolver } from '../../src/adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import { HandlebarsTemplateRenderer } from '../../src/adapters/implementations/template/renderer/handlebars/handlebars-template.renderer';
import { Jinja2TemplateRenderer } from '../../src/adapters/implementations/template/renderer/jinja2/jinja2-template.renderer';
import { NunjucksTemplateRenderer } from '../../src/adapters/implementations/template/renderer/nunjucks/nunjucks-template.renderer';
import { EjsTemplateRenderer } from '../../src/adapters/implementations/template/renderer/ejs/ejs-template.renderer';
import { TemplateRendererRegistry } from '../../src/adapters/implementations/template/renderer-registry';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
  SENDER_STORE,
} from '../../src/adapters/tokens';
import { InMemorySenderStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-sender.store';
import type {
  IEmailTransport,
  ITemplateRendererRegistry,
} from '../../src/adapters/interfaces';
import type { StoredTemplate } from '../../src/adapters/interfaces';

function createEmailTemplate(
  overrides: Partial<StoredTemplate> = {},
): StoredTemplate {
  return {
    id: 't-email',
    name: 'Email',
    type: 'email',
    subject: 'Hi {{name}}',
    body: 'Hello {{name}}',
    active: true,
    version: 1,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

describe('NotificationsService', () => {
  let service: NotificationsService;
  let templateStore: InMemoryTemplateStore;
  let sendersService: SendersService;
  let rendererRegistry: ITemplateRendererRegistry;

  beforeEach(async () => {
    const emailTransport: IEmailTransport = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    };
    const configGetMock = jest.fn((key: string, fallback?: string) => {
      if (key === 'nodemailer.from') return fallback ?? 'noreply@localhost';
      if (key === 'defaults.email.from') return fallback ?? 'noreply@localhost';
      if (key === 'defaults.templates.defaultSubject')
        return fallback ?? 'Notification';
      return undefined;
    });

    const handlebarsRenderer = new HandlebarsTemplateRenderer();
    const jinja2Renderer = new Jinja2TemplateRenderer(
      new NunjucksTemplateRenderer(),
    );
    const ejsRenderer = new EjsTemplateRenderer();
    rendererRegistry = new TemplateRendererRegistry(
      [
        { engine: 'handlebars', instance: handlebarsRenderer },
        { engine: 'jinja2', instance: jinja2Renderer },
        { engine: 'ejs', instance: ejsRenderer },
      ],
      'jinja2',
    );

    const deliveryAdapterResolver = {
      getEmailAdapter: () => emailTransport,
    };
    const deliveryContextService = {
      getEmailAdapterKey: () => 'nodemailer',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        SendersService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        { provide: ConfigService, useValue: { get: configGetMock } },
        { provide: DeliveryAdapterResolver, useValue: deliveryAdapterResolver },
        { provide: DeliveryContextService, useValue: deliveryContextService },
        { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
        { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();

    service = module.get(NotificationsService);
    templateStore = module.get(InMemoryTemplateStore);
    sendersService = module.get(SendersService);
  });

  it('sendEmail returns notification with id, content, uri, template', async () => {
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      to: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Alice' },
    });

    expect(result.id).toBeDefined();
    expect(result.content).toEqual({
      from_email: 'noreply@localhost',
      subject: 'Hi Alice',
      body: 'Hello Alice',
    });
    expect(result.uri).toMatch(/^\/v1\/notifications\/.+/);
    expect(result.template.id).toBe('t-email');
    expect(result.template.version).toBe(1);
  });

  it('sendEmail throws NotFoundException when template not found', async () => {
    await expect(
      service.sendEmail({
        to: 'user@example.com',
        template_id: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('sendEmail throws BadRequestException when template is inactive', async () => {
    templateStore.set('t-email', createEmailTemplate({ active: false }));

    await expect(
      service.sendEmail({
        to: 'user@example.com',
        template_id: 't-email',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendEmail throws BadRequestException when template type is not email', async () => {
    templateStore.set('t-sms', {
      ...createEmailTemplate(),
      id: 't-sms',
      type: 'sms',
      body: 'SMS body',
    });

    await expect(
      service.sendEmail({
        to: 'user@example.com',
        template_id: 't-sms',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendEmail uses default sender when configured', async () => {
    await sendersService.createSender({
      type: 'email',
      email_address: 'custom@gov.bc.ca',
      is_default: true,
    });
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      to: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Alice' },
    });

    expect(result.content.from_email).toBe('custom@gov.bc.ca');
  });

  it('sendEmail uses template engine when present', async () => {
    templateStore.set('t-email', createEmailTemplate({ engine: 'handlebars' }));

    const result = await service.sendEmail({
      to: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Bob' },
    });

    expect(result.content.subject).toBe('Hi Bob');
    expect(result.content.body).toBe('Hello Bob');
  });

  it('sendEmail throws BadRequestException when adapter is GC Notify', async () => {
    const deliveryAdapterResolver = {
      getEmailAdapter: () => GC_NOTIFY_CLIENT,
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        SendersService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'Notification') },
        },
        { provide: DeliveryAdapterResolver, useValue: deliveryAdapterResolver },
        {
          provide: DeliveryContextService,
          useValue: { getEmailAdapterKey: () => 'gc-notify:passthrough' },
        },
        { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
        { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();
    const gcNotifyService = module.get(NotificationsService);

    await expect(
      gcNotifyService.sendEmail({
        to: 'user@example.com',
        template_id: 't-email',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendSms returns notification with id and content', async () => {
    const result = await service.sendSms({
      phone_number: '+15551234567',
      template_id: 't-sms',
    });

    expect(result.id).toBeDefined();
    expect(result.content.body).toContain('t-sms');
    expect(result.content.from_number).toBeDefined();
    expect(result.uri).toMatch(/^\/v1\/notifications\/.+/);
  });

  it('getNotification throws NotFoundException', async () => {
    await expect(service.getNotification('any-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
