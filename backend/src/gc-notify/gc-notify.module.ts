import { DynamicModule, Module, Type } from '@nestjs/common';
import { DeliveryContextModule } from '../common/delivery-context/delivery-context.module';
import { GcNotifyApiClient } from './gc-notify-api.client';
import { GcNotifyService } from './gc-notify.service';
import { InMemoryTemplateResolver } from '../adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import { InMemoryTemplateStore } from '../adapters/implementations/storage/in-memory/in-memory-template.store';
import { InMemorySenderStore } from '../adapters/implementations/storage/in-memory/in-memory-sender.store';
import { TemplateRendererRegistry } from '../adapters/implementations/template/renderer-registry';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
  SENDER_STORE,
} from '../adapters/tokens';
import { TEMPLATE_RENDERER_REGISTRY_MAP } from '../adapters/template-renderer.registry';
import type {
  ITemplateResolver,
  ITemplateRenderer,
  ISenderStore,
} from '../adapters/interfaces';

export interface GcNotifyModuleOptions {
  templateResolver?: Type<ITemplateResolver>;
  /** Map of engine name to renderer class. Defaults to TEMPLATE_RENDERER_REGISTRY. */
  templateRenderers?: Record<string, Type<ITemplateRenderer>>;
  /** Default engine when template has no engine. Defaults to 'jinja2'. */
  defaultTemplateEngine?: string;
  senderStore?: Type<ISenderStore>;
}

/**
 * GC Notify core module - provides GcNotifyService with template resolution.
 * Email/SMS adapters are provided by AdaptersModule (shared).
 */
@Module({})
export class GcNotifyModule {
  static forRoot(options: GcNotifyModuleOptions = {}): DynamicModule {
    const templateResolver =
      options.templateResolver ?? InMemoryTemplateResolver;
    const rendererMap =
      options.templateRenderers ?? TEMPLATE_RENDERER_REGISTRY_MAP;
    const defaultEngine = options.defaultTemplateEngine ?? 'jinja2';
    const senderStore = options.senderStore ?? InMemorySenderStore;

    const rendererClasses = Object.values(rendererMap);

    const registryProvider = {
      provide: TEMPLATE_RENDERER_REGISTRY,
      useFactory: (...instances: ITemplateRenderer[]) => {
        const renderers = instances.map((instance) => ({
          engine: instance.name,
          instance,
        }));
        return new TemplateRendererRegistry(renderers, defaultEngine);
      },
      inject: rendererClasses,
    };

    return {
      module: GcNotifyModule,
      global: true,
      imports: [DeliveryContextModule],
      providers: [
        InMemoryTemplateStore,
        ...rendererClasses,
        registryProvider,
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: defaultEngine },
        GcNotifyApiClient,
        GcNotifyService,
        { provide: TEMPLATE_RESOLVER, useClass: templateResolver },
        { provide: SENDER_STORE, useClass: senderStore },
      ],
      exports: [GcNotifyService],
    };
  }
}
