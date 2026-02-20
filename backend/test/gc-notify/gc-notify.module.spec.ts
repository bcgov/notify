import { GcNotifyModule } from '../../src/gc-notify/gc-notify.module';
import { GcNotifyService } from '../../src/gc-notify/gc-notify.service';
import { TemplateResolutionModule } from '../../src/common/template-resolution/template-resolution.module';
import { DeliveryContextModule } from '../../src/common/delivery-context/delivery-context.module';
import { TemplatesModule } from '../../src/templates/templates.module';
import { SendersModule } from '../../src/senders/senders.module';

describe('GcNotifyModule', () => {
  it('forRoot returns dynamic module with template resolution from TemplateResolutionModule', () => {
    const dynamic = GcNotifyModule.forRoot();

    expect(dynamic.module).toBe(GcNotifyModule);
    expect(dynamic.global).toBe(true);
    expect(dynamic.exports).toContain(GcNotifyService);
    expect(dynamic.imports).toContain(TemplateResolutionModule);
    expect(dynamic.imports).toContain(DeliveryContextModule);
    expect(dynamic.imports).toContain(TemplatesModule);
    expect(dynamic.imports).toContain(SendersModule);
    expect(dynamic.providers).toContain(GcNotifyService);
  });
});
