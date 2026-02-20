import { Injectable } from '@nestjs/common';
import { DeliveryContextStorage } from './delivery-context.storage';

@Injectable()
export class DeliveryContextService {
  constructor(private readonly storage: DeliveryContextStorage) {}

  getEmailAdapterKey(): string {
    return this.getContext().emailAdapter;
  }

  getSmsAdapterKey(): string {
    return this.getContext().smsAdapter;
  }

  getTemplateSource(): string {
    return this.getContext().templateSource ?? 'local';
  }

  getTemplateEngine(): string {
    return this.getContext().templateEngine ?? 'jinja2';
  }

  private getContext() {
    const ctx = this.storage.get();
    if (!ctx) {
      throw new Error(
        'DeliveryContext is not set. Ensure DeliveryContextMiddleware runs before route handlers.',
      );
    }
    return ctx;
  }
}
