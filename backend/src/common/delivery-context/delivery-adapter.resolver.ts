import { Inject, Injectable } from '@nestjs/common';
import type { IEmailTransport, ISmsTransport } from '../../adapters/interfaces';
import { EMAIL_ADAPTER_MAP, SMS_ADAPTER_MAP } from '../../adapters/tokens';
import { DeliveryContextService } from './delivery-context.service';

export const GC_NOTIFY_CLIENT = 'gc-notify-client' as const;
export const CHES_PASSTHROUGH_CLIENT = 'ches-passthrough-client' as const;

function parseDeliveryKey(key: string): {
  provider: string;
  mode: 'adapter' | 'passthrough';
} {
  const [provider, mode] = key.includes(':')
    ? key.split(':')
    : [key, 'adapter'];
  return {
    provider,
    mode: mode === 'passthrough' ? 'passthrough' : 'adapter',
  };
}

@Injectable()
export class DeliveryAdapterResolver {
  constructor(
    private readonly contextService: DeliveryContextService,
    @Inject(EMAIL_ADAPTER_MAP)
    private readonly emailAdapterMap: Record<string, IEmailTransport>,
    @Inject(SMS_ADAPTER_MAP)
    private readonly smsAdapterMap: Record<string, ISmsTransport>,
  ) {}

  getEmailAdapter():
    | IEmailTransport
    | typeof GC_NOTIFY_CLIENT
    | typeof CHES_PASSTHROUGH_CLIENT {
    const key = this.contextService.getEmailAdapterKey();
    const { provider, mode } = parseDeliveryKey(key);
    if (mode === 'passthrough') {
      if (provider === 'gc-notify') return GC_NOTIFY_CLIENT;
      if (provider === 'ches') return CHES_PASSTHROUGH_CLIENT;
    }
    const adapter = this.emailAdapterMap[provider];
    if (!adapter) {
      return this.emailAdapterMap['nodemailer'] ?? this.emailAdapterMap['ches'];
    }
    return adapter;
  }

  getSmsAdapter(): ISmsTransport | typeof GC_NOTIFY_CLIENT {
    const key = this.contextService.getSmsAdapterKey();
    const { provider, mode } = parseDeliveryKey(key);
    if (mode === 'passthrough' && provider === 'gc-notify') {
      return GC_NOTIFY_CLIENT;
    }
    const adapter = this.smsAdapterMap[provider];
    if (!adapter) {
      return this.smsAdapterMap['twilio'];
    }
    return adapter;
  }
}
