import { DynamicModule, Module, Type } from '@nestjs/common';
import { AdaptersModule } from '../../adapters/adapters.module';
import { InMemoryTemplateResolver } from '../../adapters/implementations/template/resolver/in-memory/in-memory-template.resolver';
import { TemplateRendererRegistry } from '../../adapters/implementations/template/renderer-registry';
import {
  TEMPLATE_RESOLVER,
  TEMPLATE_RENDERER_REGISTRY,
  DEFAULT_TEMPLATE_ENGINE,
} from '../../adapters/tokens';
import { TEMPLATE_RENDERER_REGISTRY_MAP } from '../../adapters/template-renderer.registry';
import type {
  ITemplateResolver,
  ITemplateRenderer,
} from '../../adapters/interfaces';

export interface TemplateResolutionModuleOptions {
  /** Custom template resolver. Defaults to InMemoryTemplateResolver. */
  templateResolver?: Type<ITemplateResolver>;
  /** Map of engine name to renderer class. Defaults to TEMPLATE_RENDERER_REGISTRY_MAP. */
  templateRenderers?: Record<string, Type<ITemplateRenderer>>;
  /** Default engine when template has no engine. Defaults to 'jinja2'. */
  defaultTemplateEngine?: string;
}

/**
 * Shared template resolution module. Provides TEMPLATE_RESOLVER, TEMPLATE_RENDERER_REGISTRY,
 * and DEFAULT_TEMPLATE_ENGINE for use by notifications, gc-notify, and other API modules.
 * Imports from AdaptersModule only; no gc-notify dependency.
 */
@Module({})
export class TemplateResolutionModule {
  static forRoot(options: TemplateResolutionModuleOptions = {}): DynamicModule {
    const templateResolver =
      options.templateResolver ?? InMemoryTemplateResolver;
    const rendererMap =
      options.templateRenderers ?? TEMPLATE_RENDERER_REGISTRY_MAP;
    const defaultEngine = options.defaultTemplateEngine ?? 'jinja2';

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
      module: TemplateResolutionModule,
      global: true,
      imports: [AdaptersModule],
      providers: [
        ...rendererClasses,
        registryProvider,
        { provide: DEFAULT_TEMPLATE_ENGINE, useValue: defaultEngine },
        { provide: TEMPLATE_RESOLVER, useClass: templateResolver },
      ],
      exports: [
        TEMPLATE_RESOLVER,
        TEMPLATE_RENDERER_REGISTRY,
        DEFAULT_TEMPLATE_ENGINE,
      ],
    };
  }
}
