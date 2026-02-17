import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CreateEmailNotificationRequest,
  CreateSmsNotificationRequest,
  NotificationResponse,
  Template,
} from './v2/core/schemas';
import type { FileAttachment } from './v2/core/schemas';

interface GcNotifyErrorResponse {
  errors?: Array<{ error: string; message: string }>;
  status_code?: number;
}

@Injectable()
export class GcNotifyApiClient {
  private readonly logger = new Logger(GcNotifyApiClient.name);

  constructor(private readonly configService: ConfigService) {}

  private getBaseUrl(): string {
    const url = this.configService.get<string>('gcNotify.external.baseUrl');
    if (!url) {
      throw new Error(
        'GC_NOTIFY_BASE_URL is required when using GC Notify facade mode',
      );
    }
    return url.replace(/\/$/, '');
  }

  private async request<T>(
    method: string,
    path: string,
    authHeader: string,
    body?: unknown,
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errBody = await response.text();
      let errData: GcNotifyErrorResponse | null = null;
      try {
        errData = JSON.parse(errBody) as GcNotifyErrorResponse;
      } catch {
        this.logger.debug(
          `GC Notify API returned non-JSON error body: ${errBody.slice(0, 100)}`,
        );
      }

      const message =
        errData?.errors?.[0]?.message ?? errBody ?? response.statusText;

      if (response.status === 400) {
        throw new BadRequestException(message);
      }
      if (response.status === 404) {
        throw new NotFoundException(message);
      }

      this.logger.error(`GC Notify API error: ${response.status} ${message}`);
      throw new BadRequestException(
        `GC Notify API error: ${response.status} - ${message}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private mapPersonalisation(
    personalisation?: Record<string, string | FileAttachment>,
  ):
    | Record<
        string,
        | string
        | { file: string; filename: string; sending_method: 'attach' | 'link' }
      >
    | undefined {
    if (!personalisation || Object.keys(personalisation).length === 0) {
      return undefined;
    }

    const result: Record<
      string,
      | string
      | { file: string; filename: string; sending_method: 'attach' | 'link' }
    > = {};
    for (const [key, value] of Object.entries(personalisation)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else {
        result[key] = {
          file: value.file,
          filename: value.filename,
          sending_method: value.sending_method,
        };
      }
    }
    return result;
  }

  async sendEmail(
    body: CreateEmailNotificationRequest,
    authHeader: string,
  ): Promise<NotificationResponse> {
    const payload = {
      email_address: body.email_address,
      template_id: body.template_id,
      personalisation: this.mapPersonalisation(body.personalisation),
      reference: body.reference,
      email_reply_to_id: body.email_reply_to_id,
    };

    const raw = await this.request<{
      id: string;
      reference?: string;
      content: { subject: string; body: string; from_email: string };
      uri: string;
      template: { id: string; version: number; uri: string };
      scheduled_for?: string;
    }>('POST', '/v2/notifications/email', authHeader, payload);

    return {
      id: raw.id,
      reference: raw.reference,
      content: {
        from_email: raw.content.from_email,
        body: raw.content.body,
        subject: raw.content.subject,
      },
      uri: `/gc-notify/v2/notifications/${raw.id}`,
      template: {
        id: raw.template.id,
        version: raw.template.version,
        uri: `/gc-notify/v2/templates/${raw.template.id}`,
      },
      scheduled_for: raw.scheduled_for ?? body.scheduled_for,
    };
  }

  async sendSms(
    body: CreateSmsNotificationRequest,
    authHeader: string,
  ): Promise<NotificationResponse> {
    const payload = {
      phone_number: body.phone_number,
      template_id: body.template_id,
      personalisation: body.personalisation,
      reference: body.reference,
      sms_sender_id: body.sms_sender_id,
    };

    const raw = await this.request<{
      id: string;
      reference?: string;
      content: { body: string; from_number: string };
      uri: string;
      template: { id: string; version: number; uri: string };
      scheduled_for?: string;
    }>('POST', '/v2/notifications/sms', authHeader, payload);

    return {
      id: raw.id,
      reference: raw.reference,
      content: {
        body: raw.content.body,
        from_number: raw.content.from_number,
      },
      uri: `/gc-notify/v2/notifications/${raw.id}`,
      template: {
        id: raw.template.id,
        version: raw.template.version,
        uri: `/gc-notify/v2/templates/${raw.template.id}`,
      },
      scheduled_for: raw.scheduled_for ?? body.scheduled_for,
    };
  }

  async getTemplates(
    type: 'sms' | 'email' | undefined,
    authHeader: string,
  ): Promise<{ templates: Template[] }> {
    const query = type ? `?type=${type}` : '';
    const raw = await this.request<{ templates: unknown[] }>(
      'GET',
      `/v2/templates${query}`,
      authHeader,
    );

    const templates: Template[] = (raw.templates ?? []).map((t) =>
      this.mapTemplate(t as Record<string, unknown>),
    );

    return { templates };
  }

  async getTemplate(templateId: string, authHeader: string): Promise<Template> {
    const raw = await this.request<Record<string, unknown>>(
      'GET',
      `/v2/template/${templateId}`,
      authHeader,
    );

    return this.mapTemplate(raw);
  }

  private toSafeString(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    return '';
  }

  private mapTemplate(raw: Record<string, unknown>): Template {
    return {
      id: this.toSafeString(raw.id),
      name: this.toSafeString(raw.name),
      description:
        raw.description != null
          ? this.toSafeString(raw.description)
          : undefined,
      type: (raw.type as 'sms' | 'email') ?? 'email',
      subject: raw.subject != null ? this.toSafeString(raw.subject) : undefined,
      body: this.toSafeString(raw.body),
      personalisation:
        raw.personalisation != null
          ? (raw.personalisation as Record<string, string>)
          : undefined,
      active: raw.active !== false,
      created_at: this.toSafeString(raw.created_at) || new Date().toISOString(),
      updated_at:
        raw.updated_at != null ? this.toSafeString(raw.updated_at) : undefined,
      created_by:
        raw.created_by != null ? this.toSafeString(raw.created_by) : undefined,
    };
  }
}
