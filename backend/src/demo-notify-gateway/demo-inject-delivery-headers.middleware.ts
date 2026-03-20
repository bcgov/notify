import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import {
  getDemoNotifyEmailAdapter,
  getDemoNotifyGatewayClientHeaderName,
  getDemoNotifyGatewayClientId,
  getDemoNotifySmsAdapter,
  isDemoNotifyGatewayAuthEnabled,
  isValidDemoEmailAdapterKey,
  isValidDemoSmsAdapterKey,
  requestMatchesDemoRequest,
} from './demo-notify-settings';

function getHeader(req: Request, name: string): string | undefined {
  const key = name.toLowerCase();
  const value = req.headers[key];
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }
  return undefined;
}

@Injectable()
export class DemoInjectDeliveryHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!isDemoNotifyGatewayAuthEnabled()) {
      next();
      return;
    }

    const configuredId = getDemoNotifyGatewayClientId();
    if (!configuredId) {
      next();
      return;
    }

    const headerName = getDemoNotifyGatewayClientHeaderName();
    const presented = getHeader(req, headerName);
    if (presented !== configuredId) {
      next();
      return;
    }

    if (!requestMatchesDemoRequest(req)) {
      next();
      return;
    }

    const emailAdapter = getDemoNotifyEmailAdapter();
    if (emailAdapter && isValidDemoEmailAdapterKey(emailAdapter)) {
      const existing = getHeader(req, 'x-delivery-email-adapter');
      if (!existing) {
        req.headers['x-delivery-email-adapter'] = emailAdapter;
      }
    }

    const smsAdapter = getDemoNotifySmsAdapter();
    if (smsAdapter && isValidDemoSmsAdapterKey(smsAdapter)) {
      const existing = getHeader(req, 'x-delivery-sms-adapter');
      if (!existing) {
        req.headers['x-delivery-sms-adapter'] = smsAdapter;
      }
    }

    next();
  }
}
