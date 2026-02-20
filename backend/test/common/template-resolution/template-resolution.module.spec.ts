import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TemplateResolutionModule } from '../../../src/common/template-resolution/template-resolution.module';
import { AdaptersModule } from '../../../src/adapters/adapters.module';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
} from '../../../src/adapters/tokens';
import { InMemoryTemplateResolver } from '../../../src/adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import { InMemoryTemplateStore } from '../../../src/adapters/implementations/storage/in-memory/in-memory-template.store';
import type {
  ITemplateResolver,
  ITemplateRendererRegistry,
} from '../../../src/adapters/interfaces';

describe('TemplateResolutionModule', () => {
  it('forRoot returns dynamic module with template resolver and renderer registry', () => {
    const dynamic = TemplateResolutionModule.forRoot();

    expect(dynamic.module).toBe(TemplateResolutionModule);
    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toContain(TEMPLATE_RESOLVER);
    expect(dynamic.exports).toContain(TEMPLATE_RENDERER_REGISTRY);
    expect(dynamic.exports).toContain(DEFAULT_TEMPLATE_ENGINE);
  });

  it('forRoot provides InMemoryTemplateResolver by default', async () => {
    const dynamic = TemplateResolutionModule.forRoot();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AdaptersModule.forRoot(),
        dynamic,
      ],
    }).compile();

    const resolver = module.get<ITemplateResolver>(TEMPLATE_RESOLVER);
    expect(resolver).toBeInstanceOf(InMemoryTemplateResolver);
  });

  it('forRoot provides default engine jinja2 when not specified', async () => {
    const dynamic = TemplateResolutionModule.forRoot();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AdaptersModule.forRoot(),
        dynamic,
      ],
    }).compile();

    const defaultEngine = module.get<string>(DEFAULT_TEMPLATE_ENGINE);
    expect(defaultEngine).toBe('jinja2');
  });

  it('forRoot uses custom default engine when provided', async () => {
    const dynamic = TemplateResolutionModule.forRoot({
      defaultTemplateEngine: 'handlebars',
    });
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AdaptersModule.forRoot(),
        dynamic,
      ],
    }).compile();

    const defaultEngine = module.get<string>(DEFAULT_TEMPLATE_ENGINE);
    expect(defaultEngine).toBe('handlebars');
  });

  it('renderer registry resolves templates with default engine', async () => {
    const dynamic = TemplateResolutionModule.forRoot();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AdaptersModule.forRoot(),
        dynamic,
      ],
    }).compile();

    const resolver = module.get<ITemplateResolver>(TEMPLATE_RESOLVER);
    const store = module.get(InMemoryTemplateStore);
    store.set('t1', {
      id: 't1',
      name: 'Test',
      type: 'email',
      body: 'Hello {{name}}',
      active: true,
      version: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    });

    const template = await resolver.getById('t1');
    expect(template).not.toBeNull();
    expect(template?.body).toBe('Hello {{name}}');

    const registry = module.get<ITemplateRendererRegistry>(
      TEMPLATE_RENDERER_REGISTRY,
    );
    const renderer = registry.getRenderer('jinja2');
    const rendered = await renderer.renderEmail({
      template: template!,
      personalisation: { name: 'Alice' },
      defaultSubject: 'Hi',
    });
    expect(rendered.body).toBe('Hello Alice');
  });
});
