import { Injectable } from '@nestjs/common';
import ejs from 'ejs';
import {
  ITemplateRenderer,
  RenderContext,
  RenderedEmail,
  RenderedSms,
} from '../../../../interfaces';
import { splitPersonalisation } from '../utils/split-personalisation';

/**
 * EJS template renderer. Syntax: <%= variable %>, <%- variable %>, <% code %>.
 * Use engine "ejs" when creating templates.
 */
@Injectable()
export class EjsTemplateRenderer implements ITemplateRenderer {
  readonly name = 'ejs';

  renderEmail(context: RenderContext): RenderedEmail {
    const { strings, attachments } = splitPersonalisation(
      context.personalisation,
    );
    const subject = context.template.subject
      ? ejs.render(context.template.subject, strings)
      : 'Notification';
    const body = ejs.render(context.template.body, strings);

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
    const body = ejs.render(context.template.body, context.personalisation);
    return { body };
  }
}
