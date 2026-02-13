import { Injectable } from '@nestjs/common';
import Handlebars from 'handlebars';
import {
  ITemplateRenderer,
  RenderContext,
  RenderedEmail,
  RenderedSms,
  FileAttachmentValue,
} from '../interfaces';

function isFileAttachment(v: unknown): v is FileAttachmentValue {
  return (
    typeof v === 'object' &&
    v !== null &&
    'file' in v &&
    'filename' in v &&
    'sending_method' in v
  );
}

@Injectable()
export class HandlebarsTemplateRenderer implements ITemplateRenderer {
  readonly name = 'handlebars';

  renderEmail(context: RenderContext): RenderedEmail {
    const { strings, attachments } = this.splitPersonalisation(
      context.personalisation,
    );
    const subject = context.template.subject
      ? Handlebars.compile(context.template.subject)(strings)
      : 'Notification';
    const body = Handlebars.compile(context.template.body)(strings);

    return {
      subject,
      body,
      attachments:
        attachments.length > 0
          ? attachments.map((a) => ({
              filename: a.filename,
              content: a.content,
              sendingMethod: a.sendingMethod,
            }))
          : undefined,
    };
  }

  renderSms(
    context: RenderContext & { personalisation: Record<string, string> },
  ): RenderedSms {
    const body = Handlebars.compile(context.template.body)(
      context.personalisation,
    );
    return { body };
  }

  private splitPersonalisation(
    personalisation: Record<string, string | FileAttachmentValue>,
  ): {
    strings: Record<string, string>;
    attachments: Array<{
      filename: string;
      content: Buffer;
      sendingMethod: 'attach' | 'link';
    }>;
  } {
    const strings: Record<string, string> = {};
    const attachments: Array<{
      filename: string;
      content: Buffer;
      sendingMethod: 'attach' | 'link';
    }> = [];

    for (const [key, value] of Object.entries(personalisation)) {
      if (isFileAttachment(value)) {
        attachments.push({
          filename: value.filename,
          content: Buffer.from(value.file, 'base64'),
          sendingMethod: value.sending_method,
        });
      } else {
        strings[key] = value;
      }
    }
    return { strings, attachments };
  }
}
