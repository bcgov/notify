import { Injectable } from '@nestjs/common';
import type { RequestPrincipal } from '../auth/types';
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

  getWorkspaceId(): string {
    const workspaceId = this.getContext().workspaceId;
    if (!workspaceId) {
      throw new Error(
        'Workspace is not set for the current request. Ensure authentication resolved a workspace before accessing tenant-scoped services.',
      );
    }
    return workspaceId;
  }

  getPrincipal(): RequestPrincipal {
    const principal = this.getContext().principal;
    if (!principal) {
      throw new Error(
        'Principal is not set for the current request. Ensure authentication resolved a principal before accessing protected services.',
      );
    }
    return principal;
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
