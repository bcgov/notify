import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  NotImplementedException,
} from '@nestjs/common';
import { GcNotifyService } from '../../src/gc-notify/gc-notify.service';
import { GcNotifyApiClient } from '../../src/gc-notify/gc-notify-api.client';
import {
  DeliveryAdapterResolver,
  CHES_PASSTHROUGH_CLIENT,
} from '../../src/common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../../src/common/delivery-context/delivery-context.service';
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
import { TemplatesService } from '../../src/templates/templates.service';
import { IdentitiesService } from '../../src/identities/identities.service';
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
      name: 'nodemailer',
      send: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
    } as jest.Mocked<IEmailTransport>;
    smsTransport = {
      name: 'twilio',
      send: jest.fn().mockResolvedValue({ messageId: 'sms-1' }),
    } as jest.Mocked<ISmsTransport>;
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

    const deliveryAdapterResolver = {
      getEmailAdapter: () => emailTransport,
      getSmsAdapter: () => smsTransport,
    };
    const deliveryContextService = {
      getEmailAdapterKey: () => 'nodemailer',
      getSmsAdapterKey: () => 'twilio',
      getTemplateSource: () => 'local',
      getTemplateEngine: () => 'jinja2',
    };
    const gcNotifyApiClient = {
      sendEmail: jest.fn(),
      sendSms: jest.fn(),
      getTemplates: jest.fn(),
      getTemplate: jest.fn(),
      getNotifications: jest.fn(),
      getNotificationById: jest.fn(),
      sendBulk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcNotifyService,
        TemplatesService,
        IdentitiesService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        { provide: ConfigService, useValue: { get: configGetMock } },
        { provide: DeliveryAdapterResolver, useValue: deliveryAdapterResolver },
        { provide: DeliveryContextService, useValue: deliveryContextService },
        { provide: GcNotifyApiClient, useValue: gcNotifyApiClient },
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
    expect(result.uri).toMatch(/^\/api\/v1\/gcnotify\/notifications\/.+/);
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

    expect(result.content).toMatchObject({
      subject: 'Hi Alice',
      body: 'Hello Alice',
    });
  });

  it('sendEmail falls back to default engine when template has no engine', async () => {
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Bob' },
    });

    expect(result.content).toMatchObject({
      subject: 'Hi Bob',
      body: 'Hello Bob',
    });
  });

  it('sendEmail uses default identity when configured', async () => {
    await service.createIdentity({
      type: 'email',
      emailAddress: 'custom@gov.bc.ca',
      isDefault: true,
    });
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      personalisation: { name: 'Alice' },
    });

    expect(result.content).toMatchObject({ from_email: 'custom@gov.bc.ca' });
  });

  it('sendEmail uses email_reply_to_id identity when provided', async () => {
    const identity = await service.createIdentity({
      type: 'email',
      emailAddress: 'reply@gov.bc.ca',
    });
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.sendEmail({
      email_address: 'user@example.com',
      template_id: 't-email',
      email_reply_to_id: identity.id,
      personalisation: { name: 'Alice' },
    });

    expect(result.content).toMatchObject({ from_email: 'reply@gov.bc.ca' });
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

    expect(result.content).toMatchObject({
      subject: 'Hi Carol',
      body: 'Hello Carol',
    });
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
    expect(result.uri).toMatch(/^\/api\/v1\/gcnotify\/notifications\/.+/);
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

  it('sendBulk throws BadRequestException when rows has only header (no data rows)', async () => {
    await expect(
      service.sendBulk({
        template_id: 't-email',
        name: 'Job',
        rows: [['email address', 'name']],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendBulk returns job data when using csv instead of rows', async () => {
    const result = await service.sendBulk({
      template_id: 't-email',
      name: 'Bulk Job',
      csv: 'email address,name\na@b.com,Alice\nb@c.com,Bob',
    });

    expect(result.data.id).toBeDefined();
    expect(result.data.notification_count).toBe(2);
    expect(result.data.job_status).toBe('pending');
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

  it('getNotifications returns empty list when not in passthrough mode', async () => {
    const result = await service.getNotifications({});
    expect(result.notifications).toEqual([]);
    expect(result.links.current).toBe('/api/v1/gcnotify/notifications');
  });

  it('getNotificationById throws NotFoundException when not in passthrough mode', async () => {
    await expect(service.getNotificationById('any-id')).rejects.toThrow(
      NotFoundException,
    );
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

  it('createIdentity returns identity with id', async () => {
    const result = await service.createIdentity({
      type: 'email',
      emailAddress: 'noreply@gov.bc.ca',
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe('email');
    expect(result.emailAddress).toBe('noreply@gov.bc.ca');
  });

  it('createIdentity throws when email type missing emailAddress', () => {
    expect(() =>
      service.createIdentity({ type: 'email' } as Parameters<
        typeof service.createIdentity
      >[0]),
    ).toThrow(BadRequestException);
  });

  it('getIdentity returns identity when found', async () => {
    const created = await service.createIdentity({
      type: 'sms',
      smsSender: 'GOVBC',
    });

    const result = await service.getIdentity(created.id);
    expect(result.id).toBe(created.id);
    expect(result.smsSender).toBe('GOVBC');
  });

  it('getIdentity throws when not found', async () => {
    await expect(service.getIdentity('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateIdentity returns updated identity', async () => {
    const created = await service.createIdentity({
      type: 'email',
      emailAddress: 'old@gov.bc.ca',
    });

    const result = await service.updateIdentity(created.id, {
      emailAddress: 'new@gov.bc.ca',
    });

    expect(result.emailAddress).toBe('new@gov.bc.ca');
  });

  it('deleteIdentity removes identity', async () => {
    const created = await service.createIdentity({
      type: 'email',
      emailAddress: 'x@gov.bc.ca',
    });

    await service.deleteIdentity(created.id);
    await expect(service.getIdentity(created.id)).rejects.toThrow(
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

    expect(result).toHaveProperty('engine', 'handlebars');
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
    expect(result).toHaveProperty('version', 2);
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

  it('sendEmail throws BadRequestException when in passthrough mode without auth', async () => {
    const facadeService = await createFacadeGcNotifyService({});

    await expect(
      facadeService.sendEmail({
        email_address: 'user@example.com',
        template_id: 't-email',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendSms throws BadRequestException when in passthrough mode without auth', async () => {
    const facadeService = await createFacadeGcNotifyService({});

    await expect(
      facadeService.sendSms({
        phone_number: '+15551234567',
        template_id: 't-sms',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('sendEmail throws NotImplementedException when using CHES passthrough', async () => {
    const chesPassthroughService = await createChesPassthroughGcNotifyService();

    await expect(
      chesPassthroughService.sendEmail({
        email_address: 'user@example.com',
        template_id: 't-email',
      }),
    ).rejects.toThrow(NotImplementedException);
  });

  it('getNotifications returns client result when in passthrough mode with auth', async () => {
    const mockResult = {
      notifications: [
        {
          id: 'n-1',
          type: 'email',
          status: 'delivered',
          body: 'Hi',
          template: {
            id: 't-1',
            version: 1,
            uri: '/gc-notify/v2/templates/t-1',
          },
          created_at: '2025-01-01',
        },
      ],
      links: { current: '/gc-notify/v2/notifications', next: undefined },
    };
    const getNotificationsMock = jest.fn().mockResolvedValue(mockResult);
    const facadeService = await createFacadeGcNotifyService({
      getNotifications: getNotificationsMock,
    });

    const result = await facadeService.getNotifications(
      { template_type: 'email' },
      'ApiKey-v1 test-key',
    );

    expect(result).toEqual(mockResult);
  });

  it('getNotificationById returns client result when in passthrough mode with auth', async () => {
    const mockNotification = {
      id: 'n-1',
      type: 'email',
      status: 'delivered',
      body: 'Hi',
      template: { id: 't-1', version: 1, uri: '/gc-notify/v2/templates/t-1' },
      created_at: '2025-01-01',
    };
    const getNotificationByIdMock = jest
      .fn()
      .mockResolvedValue(mockNotification);
    const facadeService = await createFacadeGcNotifyService({
      getNotificationById: getNotificationByIdMock,
    });

    const result = await facadeService.getNotificationById(
      'n-1',
      'ApiKey-v1 test-key',
    );

    expect(result).toEqual(mockNotification);
  });

  it('sendBulk returns client result when in passthrough mode with auth', async () => {
    const mockResponse = {
      data: {
        id: 'job-1',
        template: 't-1',
        job_status: 'pending',
        notification_count: 2,
        created_at: '2025-01-01',
      },
    };
    const sendBulkMock = jest.fn().mockResolvedValue(mockResponse);
    const facadeService = await createFacadeGcNotifyService({
      sendBulk: sendBulkMock,
    });

    const result = await facadeService.sendBulk(
      {
        template_id: 't-1',
        name: 'Bulk Job',
        rows: [
          ['email address', 'name'],
          ['a@b.com', 'Alice'],
          ['b@c.com', 'Bob'],
        ],
      },
      'ApiKey-v1 test-key',
    );

    expect(result).toEqual(mockResponse);
  });
});

async function createFacadeGcNotifyService(
  clientOverrides: {
    getNotifications?: jest.Mock;
    getNotificationById?: jest.Mock;
    sendBulk?: jest.Mock;
  } = {},
): Promise<GcNotifyService> {
  const configGetMock = jest.fn((key: string, fallback?: string) => {
    if (key === 'defaults.templates.defaultSubject')
      return fallback ?? 'Notification';
    if (key === 'defaults.email.from') return fallback ?? 'noreply@localhost';
    if (key === 'defaults.sms.fromNumber') return fallback ?? '+15551234567';
    if (key === 'twilio.fromNumber') return fallback ?? '+15551234567';
    return undefined;
  });
  const handlebarsRenderer = new HandlebarsTemplateRenderer();
  const jinja2Renderer = new Jinja2TemplateRenderer(
    new NunjucksTemplateRenderer(),
  );
  const ejsRenderer = new EjsTemplateRenderer();
  const rendererRegistry = new TemplateRendererRegistry(
    [
      { engine: 'handlebars', instance: handlebarsRenderer },
      { engine: 'jinja2', instance: jinja2Renderer },
      { engine: 'ejs', instance: ejsRenderer },
    ],
    'jinja2',
  );
  const gcNotifyApiClient = {
    sendEmail: jest.fn(),
    sendSms: jest.fn(),
    getTemplates: jest.fn(),
    getTemplate: jest.fn(),
    getNotifications: clientOverrides.getNotifications ?? jest.fn(),
    getNotificationById: clientOverrides.getNotificationById ?? jest.fn(),
    sendBulk: clientOverrides.sendBulk ?? jest.fn(),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GcNotifyService,
      TemplatesService,
      IdentitiesService,
      InMemoryTemplateStore,
      InMemoryTemplateResolver,
      { provide: ConfigService, useValue: { get: configGetMock } },
      {
        provide: DeliveryAdapterResolver,
        useValue: {
          getEmailAdapter: () => 'gc-notify-client',
          getSmsAdapter: () => 'gc-notify-client',
        },
      },
      {
        provide: DeliveryContextService,
        useValue: {
          getEmailAdapterKey: () => 'gc-notify:passthrough',
          getSmsAdapterKey: () => 'gc-notify:passthrough',
        },
      },
      { provide: GcNotifyApiClient, useValue: gcNotifyApiClient },
      { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
      { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
      { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
      { provide: SENDER_STORE, useClass: InMemorySenderStore },
    ],
  }).compile();
  return module.get(GcNotifyService);
}

async function createChesPassthroughGcNotifyService(): Promise<GcNotifyService> {
  const configGetMock = jest.fn((key: string, fallback?: string) => {
    if (key === 'defaults.templates.defaultSubject')
      return fallback ?? 'Notification';
    if (key === 'defaults.email.from') return fallback ?? 'noreply@localhost';
    if (key === 'defaults.sms.fromNumber') return fallback ?? '+15551234567';
    if (key === 'twilio.fromNumber') return fallback ?? '+15551234567';
    return undefined;
  });
  const handlebarsRenderer = new HandlebarsTemplateRenderer();
  const jinja2Renderer = new Jinja2TemplateRenderer(
    new NunjucksTemplateRenderer(),
  );
  const ejsRenderer = new EjsTemplateRenderer();
  const rendererRegistry = new TemplateRendererRegistry(
    [
      { engine: 'handlebars', instance: handlebarsRenderer },
      { engine: 'jinja2', instance: jinja2Renderer },
      { engine: 'ejs', instance: ejsRenderer },
    ],
    'jinja2',
  );
  const gcNotifyApiClient = {
    sendEmail: jest.fn(),
    sendSms: jest.fn(),
    getTemplates: jest.fn(),
    getTemplate: jest.fn(),
    getNotifications: jest.fn(),
    getNotificationById: jest.fn(),
    sendBulk: jest.fn(),
  };
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GcNotifyService,
      TemplatesService,
      IdentitiesService,
      InMemoryTemplateStore,
      InMemoryTemplateResolver,
      { provide: ConfigService, useValue: { get: configGetMock } },
      {
        provide: DeliveryAdapterResolver,
        useValue: {
          getEmailAdapter: () => CHES_PASSTHROUGH_CLIENT,
          getSmsAdapter: () =>
            ({ name: 'twilio', send: jest.fn() }) as unknown as ISmsTransport,
        },
      },
      {
        provide: DeliveryContextService,
        useValue: {
          getEmailAdapterKey: () => 'ches:passthrough',
          getSmsAdapterKey: () => 'twilio',
        },
      },
      { provide: GcNotifyApiClient, useValue: gcNotifyApiClient },
      { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
      { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
      { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
      { provide: SENDER_STORE, useClass: InMemorySenderStore },
    ],
  }).compile();
  return module.get(GcNotifyService);
}
