import { Inject, Injectable } from '@nestjs/common';
import type { IEmailTransport, ISmsTransport } from '../../adapters/interfaces';
import { EMAIL_ADAPTER_MAP, SMS_ADAPTER_MAP } from '../../adapters/tokens';
import { DeliveryContextService } from './delivery-context.service';

export const GC_NOTIFY_CLIENT = 'gc-notify-client' as const;

@Injectable()
export class DeliveryAdapterResolver {
  constructor(
    private readonly contextService: DeliveryContextService,
    @Inject(EMAIL_ADAPTER_MAP)
    private readonly emailAdapterMap: Record<string, IEmailTransport>,
    @Inject(SMS_ADAPTER_MAP)
    private readonly smsAdapterMap: Record<string, ISmsTransport>,
  ) {}

  getEmailAdapter(): IEmailTransport | typeof GC_NOTIFY_CLIENT {
    const key = this.contextService.getEmailAdapterKey();
    if (key === 'gc-notify') {
      return GC_NOTIFY_CLIENT;
    }
    const adapter = this.emailAdapterMap[key];
    if (!adapter) {
      return this.emailAdapterMap['nodemailer'] ?? this.emailAdapterMap['ches'];
    }
    return adapter;
  }

  getSmsAdapter(): ISmsTransport | typeof GC_NOTIFY_CLIENT {
    const key = this.contextService.getSmsAdapterKey();
    if (key === 'gc-notify') {
      return GC_NOTIFY_CLIENT;
    }
    const adapter = this.smsAdapterMap[key];
    if (!adapter) {
      return this.smsAdapterMap['twilio'];
    }
    return adapter;
  }
}
