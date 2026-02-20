import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import type { DeliveryContext } from './delivery-context.interface';
import { DeliveryContextStorage } from './delivery-context.storage';

@Injectable()
export class DeliveryContextMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly storage: DeliveryContextStorage,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const ctx = this.resolveContext(req);
    this.storage.run(ctx, () => next());
  }

  private static readonly VALID_EMAIL_KEYS = new Set([
    'nodemailer',
    'ches',
    'gc-notify:passthrough',
    'ches:passthrough',
  ]);
  private static readonly VALID_SMS_KEYS = new Set(['twilio', 'gc-notify:passthrough']);

  private resolveContext(req: Request): DeliveryContext {
    const headerEmail = this.getHeader(req, 'x-delivery-email-adapter');
    const headerSms = this.getHeader(req, 'x-delivery-sms-adapter');

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
    };
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
