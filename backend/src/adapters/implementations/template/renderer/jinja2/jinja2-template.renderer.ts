import { Injectable } from '@nestjs/common';
import { NunjucksTemplateRenderer } from '../nunjucks/nunjucks-template.renderer';
import type {
  ITemplateRenderer,
  RenderContext,
  RenderedEmail,
  RenderedSms,
} from '../../../../interfaces';

/**
 * Jinja2-style template renderer. Uses Nunjucks under the hood (Jinja2-inspired).
 * Syntax: {{ variable }}, {% for %}, {% if %}, etc.
 * Use engine "jinja2" when creating templates.
 */
@Injectable()
export class Jinja2TemplateRenderer implements ITemplateRenderer {
  readonly name = 'jinja2';

  constructor(private readonly nunjucks: NunjucksTemplateRenderer) {}

  renderEmail(context: RenderContext): RenderedEmail {
    return this.nunjucks.renderEmail(context);
  }

  renderSms(
    context: RenderContext & { personalisation: Record<string, string> },
  ): RenderedSms {
    return this.nunjucks.renderSms(context);
  }
}
