import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { PrincipalResolver } from '../auth/principal-resolver.service';
import type { AuthenticatedRequest, RequestPrincipal } from '../auth/types';
import type { DeliveryContext } from './delivery-context.interface';
import { DeliveryContextStorage } from './delivery-context.storage';

@Injectable()
export class DeliveryContextMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly principalResolver: PrincipalResolver,
    private readonly storage: DeliveryContextStorage,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const ctx = this.resolveContext(req as AuthenticatedRequest);
    this.storage.run(ctx, () => next());
  }

  private static readonly VALID_EMAIL_KEYS = new Set([
    'nodemailer',
    'ches',
    'gc-notify:passthrough',
    'ches:passthrough',
  ]);
  private static readonly VALID_SMS_KEYS = new Set([
    'twilio',
    'gc-notify:passthrough',
  ]);

  private resolveContext(req: AuthenticatedRequest): DeliveryContext {
    const headerEmail = this.getHeader(req, 'x-delivery-email-adapter');
    const headerSms = this.getHeader(req, 'x-delivery-sms-adapter');
    const principal = this.resolvePrincipal(req);

    const emailAdapter =
      headerEmail && DeliveryContextMiddleware.VALID_EMAIL_KEYS.has(headerEmail)
        ? headerEmail
        : (this.configService.get<string>('delivery.email') ?? 'nodemailer');
    const smsAdapter =
      headerSms && DeliveryContextMiddleware.VALID_SMS_KEYS.has(headerSms)
        ? headerSms
        : (this.configService.get<string>('delivery.sms') ?? 'twilio');
    const templateEngine =
      this.configService.get<string>('gcNotify.defaultTemplateEngine') ??
      'jinja2';

    return {
      emailAdapter,
      smsAdapter,
      templateSource: 'local',
      templateEngine,
      workspaceId: principal?.workspaceId,
      workspaceKind: principal?.workspaceKind,
      principalType: principal?.type,
      principal,
    };
  }

  private resolvePrincipal(
    req: AuthenticatedRequest,
  ): RequestPrincipal | undefined {
    try {
      const principal =
        this.principalResolver.resolveOptional(req) ?? undefined;
      req.principal = principal;
      req.authResolutionError = undefined;
      return principal;
    } catch (error) {
      req.principal = undefined;
      req.authResolutionError =
        error instanceof Error
          ? error
          : new Error('Principal resolution failed');
      return undefined;
    }
  }

  private getHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
    if (Array.isArray(value) && value[0]?.trim()) {
      return value[0].trim().toLowerCase();
    }
    return undefined;
  }
}
