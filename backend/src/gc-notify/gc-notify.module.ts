import { DynamicModule, Module, Type } from '@nestjs/common';
import { GcNotifyService } from './gc-notify.service';
import { HandlebarsTemplateRenderer } from './transports/handlebars/handlebars-template.renderer';
import { InMemoryTemplateResolver } from './transports/in-memory-template.resolver';
import { InMemoryTemplateStore } from './transports/in-memory-template.store';
import { TEMPLATE_RESOLVER, TEMPLATE_RENDERER } from './transports/tokens';
import type {
  ITemplateResolver,
  ITemplateRenderer,
} from './transports/interfaces';

export interface GcNotifyModuleOptions {
  templateResolver?: Type<ITemplateResolver>;
  templateRenderer?: Type<ITemplateRenderer>;
}

/**
 * GC Notify core module - provides GcNotifyService with template resolution.
 * Email/SMS transports are provided by TransportsModule (shared).
 */
@Module({})
export class GcNotifyModule {
  static forRoot(options: GcNotifyModuleOptions = {}): DynamicModule {
    const templateResolver =
      options.templateResolver ?? InMemoryTemplateResolver;
    const templateRenderer =
      options.templateRenderer ?? HandlebarsTemplateRenderer;

    return {
      module: GcNotifyModule,
      global: true,
      providers: [
        InMemoryTemplateStore,
        GcNotifyService,
        { provide: TEMPLATE_RESOLVER, useClass: templateResolver },
        { provide: TEMPLATE_RENDERER, useClass: templateRenderer },
      ],
      exports: [GcNotifyService],
    };
  }
}
