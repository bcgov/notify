import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GcNotifyService } from '../../src/gc-notify/gc-notify.service';
import { InMemoryTemplateStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-template.store';
import { InMemoryTemplateResolver } from '../../src/adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import { HandlebarsTemplateRenderer } from '../../src/adapters/implementations/template/renderer/handlebars/handlebars-template.renderer';
import { Jinja2TemplateRenderer } from '../../src/adapters/implementations/template/renderer/jinja2/jinja2-template.renderer';
import { NunjucksTemplateRenderer } from '../../src/adapters/implementations/template/renderer/nunjucks/nunjucks-template.renderer';
import { EjsTemplateRenderer } from '../../src/adapters/implementations/template/renderer/ejs/ejs-template.renderer';
import { TemplateRendererRegistry } from '../../src/adapters/implementations/template/renderer-registry';
import { EMAIL_ADAPTER, SMS_ADAPTER } from '../../src/adapters/tokens';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
  SENDER_STORE,
} from '../../src/adapters/tokens';
import { InMemorySenderStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-sender.store';
import type {
  IEmailTransport,
  ISmsTransport,
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

function createSmsTemplate(
  overrides: Partial<StoredTemplate> = {},
): StoredTemplate {
  return {
    id: 't-sms',
    name: 'SMS',
    type: 'sms',
    body: 'Hi {{name}}',
    active: true,
    version: 1,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...overrides,
  };
}

describe('GcNotifyService', () => {
  let service: GcNotifyService;
  let templateStore: InMemoryTemplateStore;
  let emailTransport: jest.Mocked<IEmailTransport>;
  let smsTransport: jest.Mocked<ISmsTransport>;
  let configGetMock: jest.Mock;

  let rendererRegistry: ITemplateRendererRegistry;

  beforeEach(async () => {
    emailTransport = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    };
    smsTransport = {
      send: jest.fn().mockResolvedValue({ messageId: 'sms-1' }),
    };
    configGetMock = jest.fn((key: string, fallback?: string) => {
      if (key === 'delivery.email') return fallback ?? 'nodemailer';
      if (key === 'nodemailer.from') return fallback ?? 'noreply@localhost';
      if (key === 'twilio.fromNumber') return fallback ?? '+15551234567';
      if (key === 'defaults.email.from') return fallback ?? 'noreply@localhost';
      if (key === 'defaults.sms.fromNumber') return fallback ?? '+15551234567';
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcNotifyService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        { provide: ConfigService, useValue: { get: configGetMock } },
        { provide: EMAIL_ADAPTER, useValue: emailTransport },
        { provide: SMS_ADAPTER, useValue: smsTransport },
        { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
        { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();

    service = module.get(GcNotifyService);
    templateStore = module.get(InMemoryTemplateStore);
  });

  it('sendEmail returns NotificationResponse with id, content, uri, template', async () => {
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Alice' },
    });

    expect(result.id).toBeDefined();
    expect(result.content).toEqual({
      from_email: 'noreply@localhost',
      subject: 'Hi Alice',
      body: 'Hello Alice',
    });
    expect(result.uri).toMatch(/^\/gc-notify\/v2\/notifications\/.+/);
    expect(result.template.id).toBe('t-email');
    expect(result.template.version).toBe(1);
  });

  it('sendEmail throws NotFoundException when template not found', async () => {
    await expect(
      service.sendEmail({
        email_address: 'user@example.com',
        template_id: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('sendEmail throws BadRequestException when template is inactive', async () => {
    templateStore.set('t-email', createEmailTemplate({ active: false }));

    await expect(
      service.sendEmail({
        email_address: 'user@example.com',
        template_id: 't-email',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendEmail throws BadRequestException when template type is not email', async () => {
    templateStore.set('t-sms', createSmsTemplate());

    await expect(
      service.sendEmail({
        email_address: 'user@example.com',
        template_id: 't-sms',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendEmail uses template.engine when present', async () => {
    templateStore.set('t-email', createEmailTemplate({ engine: 'handlebars' }));

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Alice' },
    });

    expect(result.content.subject).toBe('Hi Alice');
    expect(result.content.body).toBe('Hello Alice');
  });

  it('sendEmail falls back to default engine when template has no engine', async () => {
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Bob' },
    });

    expect(result.content.subject).toBe('Hi Bob');
    expect(result.content.body).toBe('Hello Bob');
  });

  it('sendEmail uses EJS engine when template specifies engine: ejs', async () => {
    templateStore.set(
      't-email',
      createEmailTemplate({
        engine: 'ejs',
        subject: 'Hi <%= name %>',
        body: 'Hello <%= name %>',
      }),
    );

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Carol' },
    });

    expect(result.content.subject).toBe('Hi Carol');
    expect(result.content.body).toBe('Hello Carol');
  });

  it('sendSms returns NotificationResponse with id, content, uri, template', async () => {
    templateStore.set('t-sms', createSmsTemplate());

    const result = await service.sendSms({
      phone_number: '+15551234567',
      template_id: 't-sms',
      personalisation: { name: 'Bob' },
    });

    expect(result.id).toBeDefined();
    expect(result.content).toEqual({
      body: 'Hi Bob',
      from_number: '+15551234567',
    });
    expect(result.uri).toMatch(/^\/gc-notify\/v2\/notifications\/.+/);
    expect(result.template.id).toBe('t-sms');
  });

  it('sendSms throws NotFoundException when template not found', async () => {
    await expect(
      service.sendSms({
        phone_number: '+15551234567',
        template_id: 'missing',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('sendBulk returns PostBulkResponse with job data', async () => {
    const result = await service.sendBulk({
      template_id: 't-email',
      name: 'Bulk Job',
      rows: [
        ['email address', 'name'],
        ['a@b.com', 'Alice'],
      ],
    });

    expect(result.data.id).toBeDefined();
    expect(result.data.template).toBe('t-email');
    expect(result.data.job_status).toBe('pending');
    expect(result.data.notification_count).toBe(1);
    expect(result.data.created_at).toBeDefined();
  });

  it('sendBulk throws BadRequestException when neither rows nor csv provided', async () => {
    await expect(
      service.sendBulk({
        template_id: 't-email',
        name: 'Job',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendBulk throws BadRequestException when row count exceeds 50000', async () => {
    const header = ['email', 'name'];
    const rows = Array.from({ length: 50001 }, (_, i) => [
      `u${i}@x.com`,
      `User${i}`,
    ]);

    await expect(
      service.sendBulk({
        template_id: 't-email',
        name: 'Huge',
        rows: [header, ...rows],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('getTemplates returns all templates when no type filter', async () => {
    templateStore.set('t1', createEmailTemplate({ id: 't1' }));
    templateStore.set('t2', createSmsTemplate({ id: 't2' }));

    const result = await service.getTemplates();
    expect(result.templates).toHaveLength(2);
  });

  it('getTemplates filters by type when type provided', async () => {
    templateStore.set('t1', createEmailTemplate({ id: 't1' }));
    templateStore.set('t2', createSmsTemplate({ id: 't2' }));

    const result = await service.getTemplates('email');
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].type).toBe('email');
  });

  it('getTemplate returns template when found', async () => {
    const t = createEmailTemplate({ id: 't1' });
    templateStore.set('t1', t);

    const result = await service.getTemplate('t1');
    expect(result).toEqual(t);
  });

  it('getTemplate throws NotFoundException when not found', async () => {
    await expect(service.getTemplate('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createSender returns sender with id', async () => {
    const result = await service.createSender({
      type: 'email',
      email_address: 'noreply@gov.bc.ca',
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe('email');
    expect(result.email_address).toBe('noreply@gov.bc.ca');
  });

  it('createSender throws when email type missing email_address', async () => {
    await expect(service.createSender({ type: 'email' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getSender returns sender when found', async () => {
    const created = await service.createSender({
      type: 'sms',
      sms_sender: 'GOVBC',
    });

    const result = await service.getSender(created.id);
    expect(result.id).toBe(created.id);
    expect(result.sms_sender).toBe('GOVBC');
  });

  it('getSender throws when not found', async () => {
    await expect(service.getSender('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateSender returns updated sender', async () => {
    const created = await service.createSender({
      type: 'email',
      email_address: 'old@gov.bc.ca',
    });

    const result = await service.updateSender(created.id, {
      email_address: 'new@gov.bc.ca',
    });

    expect(result.email_address).toBe('new@gov.bc.ca');
  });

  it('deleteSender removes sender', async () => {
    const created = await service.createSender({
      type: 'email',
      email_address: 'x@gov.bc.ca',
    });

    await service.deleteSender(created.id);
    await expect(service.getSender(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createTemplate returns template with id', async () => {
    const result = await service.createTemplate({
      name: 'Welcome',
      type: 'email',
      body: 'Hello',
      subject: 'Hi',
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Welcome');
    expect(result.body).toBe('Hello');
  });

  it('createTemplate persists engine when provided', async () => {
    const result = await service.createTemplate({
      name: 'Welcome',
      type: 'email',
      body: 'Hello {{name}}',
      subject: 'Hi',
      engine: 'handlebars',
    });

    expect(result.engine).toBe('handlebars');
  });

  it('updateTemplate returns updated template', async () => {
    const created = await service.createTemplate({
      name: 'Old',
      type: 'email',
      body: 'B1',
    });

    const result = await service.updateTemplate(created.id, {
      name: 'New',
      body: 'B2',
    });

    expect(result.name).toBe('New');
    expect(result.body).toBe('B2');
    expect(result.version).toBe(2);
  });

  it('deleteTemplate removes template', async () => {
    const created = await service.createTemplate({
      name: 'X',
      type: 'email',
      body: 'B',
    });

    await service.deleteTemplate(created.id);
    await expect(service.getTemplate(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
