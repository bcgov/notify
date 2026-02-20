import { Test, TestingModule } from '@nestjs/testing';
import { Jinja2TemplateRenderer } from '../../../../../../src/adapters/implementations/template/renderer/jinja2/jinja2-template.renderer';
import { NunjucksTemplateRenderer } from '../../../../../../src/adapters/implementations/template/renderer/nunjucks/nunjucks-template.renderer';
import type { TemplateDefinition } from '../../../../../../src/adapters/interfaces';

describe('Jinja2TemplateRenderer', () => {
  let renderer: Jinja2TemplateRenderer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NunjucksTemplateRenderer, Jinja2TemplateRenderer],
    }).compile();
    renderer = module.get(Jinja2TemplateRenderer);
  });

  it('exposes name as jinja2', () => {
    expect(renderer.name).toBe('jinja2');
  });

  it('renderEmail returns subject and body with Jinja2-style syntax', async () => {
    const template: TemplateDefinition = {
      id: 't1',
      name: 'Welcome',
      type: 'email',
      subject: 'Hello {{ name }}',
      body: 'Welcome, {{ name }}. Your code is {{ code }}.',
      active: true,
    };

    const result = await renderer.renderEmail({
      template,
      personalisation: { name: 'Alice', code: '123' },
    });

    expect(result.subject).toBe('Hello Alice');
    expect(result.body).toBe('Welcome, Alice. Your code is 123.');
  });
});
