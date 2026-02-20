import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { NotifyService } from '../../src/notify/notify.service';
import {
  DeliveryAdapterResolver,
  GC_NOTIFY_CLIENT,
} from '../../src/common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../../src/common/delivery-context/delivery-context.service';
import { IdentitiesService } from '../../src/identities/identities.service';
import { NotifyTypesService } from '../../src/notify-types/notify-types.service';
import { DefaultsService } from '../../src/defaults/defaults.service';
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
import { InMemoryDefaultsStore } from '../../src/defaults/stores/in-memory-defaults.store';
import { InMemoryNotifyTypeStore } from '../../src/notify-types/stores/in-memory-notify-type.store';
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

describe('NotifyService', () => {
  let service: NotifyService;
  let templateStore: InMemoryTemplateStore;
  let identitiesService: IdentitiesService;
  let notifyTypesService: NotifyTypesService;
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

    const deliveryAdapterResolver = { getEmailAdapter: () => emailTransport };
    const deliveryContextService = { getEmailAdapterKey: () => 'nodemailer' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyService,
        IdentitiesService,
        NotifyTypesService,
        DefaultsService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        InMemoryDefaultsStore,
        InMemoryNotifyTypeStore,
        { provide: ConfigService, useValue: { get: configGetMock } },
        { provide: DeliveryAdapterResolver, useValue: deliveryAdapterResolver },
        { provide: DeliveryContextService, useValue: deliveryContextService },
        { provide: TEMPLATE_RESOLVER, useClass: InMemoryTemplateResolver },
        { provide: TEMPLATE_RENDERER_REGISTRY, useValue: rendererRegistry },
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: 'jinja2' },
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();

    service = module.get(NotifyService);
    templateStore = module.get(InMemoryTemplateStore);
    identitiesService = module.get(IdentitiesService);
    notifyTypesService = module.get(NotifyTypesService);
  });

  it('send returns NotifyResponse with notifyId, txId, messages', async () => {
    notifyTypesService.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
    });
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.send({
      notifyType: 'single-email',
      override: {
        common: {
          to: ['user@example.com'],
          templateId: 't-email',
          params: { name: 'Alice' },
          sendAs: 'email',
        },
      },
    });

    expect(result.notifyId).toBeDefined();
    expect(result.txId).toBeDefined();
    expect(result.messages).toHaveLength(1);
    expect(result.messages![0].channel).toBe('email');
    expect(result.messages![0].to).toEqual(['user@example.com']);
  });

  it('send throws NotFoundException when notifyType not found', async () => {
    templateStore.set('t-email', createEmailTemplate());

    await expect(
      service.send({
        notifyType: 'missing',
        override: {
          common: { to: ['u@x.com'], templateId: 't-email', sendAs: 'email' },
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('send throws NotFoundException when template not found', async () => {
    notifyTypesService.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
    });

    await expect(
      service.send({
        notifyType: 'single-email',
        override: {
          common: { to: ['u@x.com'], templateId: 'missing', sendAs: 'email' },
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('send throws BadRequestException when template is inactive', async () => {
    notifyTypesService.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
    });
    templateStore.set('t-email', createEmailTemplate({ active: false }));

    await expect(
      service.send({
        notifyType: 'single-email',
        override: {
          common: { to: ['u@x.com'], templateId: 't-email', sendAs: 'email' },
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('send throws BadRequestException when template type is not email', async () => {
    notifyTypesService.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
    });
    templateStore.set('t-sms', {
      ...createEmailTemplate(),
      id: 't-sms',
      type: 'sms',
      body: 'SMS body',
    });

    await expect(
      service.send({
        notifyType: 'single-email',
        override: {
          common: { to: ['u@x.com'], templateId: 't-sms', sendAs: 'email' },
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('send uses default identity when configured', async () => {
    const identity = await identitiesService.createIdentity({
      type: 'email',
      emailAddress: 'custom@gov.bc.ca',
      isDefault: true,
    });
    notifyTypesService.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
      identityId: identity.id,
    });
    templateStore.set('t-email', createEmailTemplate());

    const result = await service.send({
      notifyType: 'single-email',
      override: {
        common: {
          to: ['u@x.com'],
          templateId: 't-email',
          params: { name: 'A' },
          sendAs: 'email',
        },
      },
    });

    expect(result.notifyId).toBeDefined();
  });

  it('send throws BadRequestException when adapter is GC Notify', async () => {
    const deliveryAdapterResolver = { getEmailAdapter: () => GC_NOTIFY_CLIENT };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        NotifyService,
        IdentitiesService,
        NotifyTypesService,
        DefaultsService,
        InMemoryTemplateStore,
        InMemoryTemplateResolver,
        InMemoryDefaultsStore,
        InMemoryNotifyTypeStore,
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
    const gcNotifySvc = mod.get(NotifyService);
    const modNotifyTypes = mod.get(NotifyTypesService);
    const modTemplateStore = mod.get(InMemoryTemplateStore);

    modNotifyTypes.createNotifyType({ code: 'single-email', sendAs: 'email' });
    modTemplateStore.set('t-email', createEmailTemplate());

    await expect(
      gcNotifySvc.send({
        notifyType: 'single-email',
        override: {
          common: { to: ['u@x.com'], templateId: 't-email', sendAs: 'email' },
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
