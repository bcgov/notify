import { GcNotifyModule } from '../../src/gc-notify/gc-notify.module';
import { GcNotifyService } from '../../src/gc-notify/gc-notify.service';
import { InMemoryTemplateResolver } from '../../src/adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
  SENDER_STORE,
} from '../../src/adapters/tokens';
import { InMemorySenderStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-sender.store';

describe('GcNotifyModule', () => {
  it('forRoot returns dynamic module with default resolver, registry, and sender store', () => {
    const dynamic = GcNotifyModule.forRoot();

    expect(dynamic.module).toBe(GcNotifyModule);
    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toContain(GcNotifyService);

    const resolverProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === TEMPLATE_RESOLVER,
    ) as { useClass: unknown };
    const registryProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === TEMPLATE_RENDERER_REGISTRY,
    );
    const defaultEngineProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === DEFAULT_TEMPLATE_ENGINE,
    ) as { useValue: unknown };
    const senderStoreProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === SENDER_STORE,
    ) as { useClass: unknown };

    expect(resolverProvider.useClass).toBe(InMemoryTemplateResolver);
    expect(registryProvider).toBeDefined();
    expect(defaultEngineProvider.useValue).toBe('jinja2');
    expect(senderStoreProvider.useClass).toBe(InMemorySenderStore);
  });

  it('forRoot uses custom templateRenderers and defaultTemplateEngine when provided', () => {
    class CustomRenderer {
      readonly name = 'custom';
      renderEmail = jest.fn().mockResolvedValue({ subject: 's', body: 'b' });
      renderSms = jest.fn().mockResolvedValue({ body: 'b' });
    }

    const dynamic = GcNotifyModule.forRoot({
      templateRenderers: { custom: CustomRenderer },
      defaultTemplateEngine: 'custom',
    });

    const defaultEngineProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === DEFAULT_TEMPLATE_ENGINE,
    ) as { useValue: unknown };
    expect(defaultEngineProvider.useValue).toBe('custom');

    const hasCustomRenderer =
      dynamic.providers?.includes(CustomRenderer) ||
      dynamic.providers?.some(
        (p: { useClass?: unknown }) => p?.useClass === CustomRenderer,
      );
    expect(hasCustomRenderer).toBe(true);
  });

  it('forRoot uses custom resolver and sender store when provided', () => {
    class CustomResolver {}
    class CustomSenderStore {}

    const dynamic = GcNotifyModule.forRoot({
      templateResolver: CustomResolver,
      senderStore: CustomSenderStore,
    });

    const resolverProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === TEMPLATE_RESOLVER,
    ) as { useClass: unknown };
    const senderStoreProvider = dynamic.providers?.find(
      (p: { provide?: symbol }) => p.provide === SENDER_STORE,
    ) as { useClass: unknown };

    expect(resolverProvider.useClass).toBe(CustomResolver);
    expect(senderStoreProvider.useClass).toBe(CustomSenderStore);
  });
});
