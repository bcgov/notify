import { TemplateDefinition } from './template-resolver.interface';

export interface FileAttachmentValue {
  file: string;
  filename: string;
  sending_method: 'attach' | 'link';
}

export interface RenderContext {
  template: TemplateDefinition;
  personalisation: Record<string, string | FileAttachmentValue>;
}

export interface RenderedEmail {
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    sendingMethod: 'attach' | 'link';
  }>;
}

export interface RenderedSms {
  body: string;
}

export interface ITemplateRenderer {
  readonly name: string;
  renderEmail(context: RenderContext): RenderedEmail;
  renderSms(
    context: RenderContext & { personalisation: Record<string, string> },
  ): RenderedSms;
}
