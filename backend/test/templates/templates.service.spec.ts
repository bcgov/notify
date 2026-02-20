import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemplatesService } from '../../src/templates/templates.service';
import { InMemoryTemplateStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-template.store';

describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService, InMemoryTemplateStore],
    }).compile();

    service = module.get(TemplatesService);
  });

  it('getTemplates returns all templates when no type filter', async () => {
    await service.createTemplate({
      name: 'A',
      type: 'email',
      body: 'Body A',
    });
    await service.createTemplate({
      name: 'B',
      type: 'sms',
      body: 'Body B',
    });

    const result = service.getTemplates();
    expect(result.templates).toHaveLength(2);
  });

  it('getTemplates filters by type when type provided', async () => {
    await service.createTemplate({
      name: 'Email',
      type: 'email',
      body: 'Hi',
    });
    await service.createTemplate({
      name: 'SMS',
      type: 'sms',
      body: 'Hello',
    });

    const result = service.getTemplates('email');
    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].type).toBe('email');
  });

  it('getTemplate returns template when found', async () => {
    const created = await service.createTemplate({
      name: 'Welcome',
      type: 'email',
      body: 'Hello {{name}}',
      subject: 'Hi',
    });

    const result = await service.getTemplate(created.id);
    expect(result.id).toBe(created.id);
    expect(result.name).toBe('Welcome');
    expect(result.body).toBe('Hello {{name}}');
  });

  it('getTemplate throws NotFoundException when not found', async () => {
    await expect(service.getTemplate('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createTemplate returns template with id and timestamps', async () => {
    const result = await service.createTemplate({
      name: 'Test',
      type: 'email',
      body: 'Body',
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test');
    expect(result.type).toBe('email');
    expect(result.body).toBe('Body');
    expect(result.created_at).toBeDefined();
    expect(result.updated_at).toBeDefined();
    expect(result.version).toBe(1);
  });

  it('createTemplate defaults active to true', async () => {
    const result = await service.createTemplate({
      name: 'Test',
      type: 'email',
      body: 'Body',
    });

    expect(result.active).toBe(true);
  });

  it('createTemplate sets active when provided', async () => {
    const result = await service.createTemplate({
      name: 'Test',
      type: 'email',
      body: 'Body',
      active: false,
    });

    expect(result.active).toBe(false);
  });

  it('createTemplate persists engine when provided', async () => {
    const result = await service.createTemplate({
      name: 'Test',
      type: 'email',
      body: 'Hello {{name}}',
      engine: 'handlebars',
    });

    expect(result.engine).toBe('handlebars');
  });

  it('updateTemplate returns updated template with incremented version', async () => {
    const created = await service.createTemplate({
      name: 'Old',
      type: 'email',
      body: 'B1',
    });

    const result = await service.updateTemplate(created.id, {
      name: 'New',
      body: 'B2',
    });

    expect(result.name).toBe('New');
    expect(result.body).toBe('B2');
    expect(result.version).toBe(2);
  });

  it('updateTemplate throws NotFoundException when not found', async () => {
    await expect(
      service.updateTemplate('missing', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteTemplate removes template', async () => {
    const created = await service.createTemplate({
      name: 'X',
      type: 'email',
      body: 'B',
    });

    await service.deleteTemplate(created.id);

    await expect(service.getTemplate(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deleteTemplate throws NotFoundException when not found', async () => {
    await expect(service.deleteTemplate('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
