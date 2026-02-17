import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryTemplateStore } from '../adapters/implementations/storage/in-memory/in-memory-template.store';
import type { StoredTemplate } from '../adapters/interfaces';
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from './v1/core/schemas';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly templateStore: InMemoryTemplateStore) {}

  getTemplates(type?: 'sms' | 'email'): { templates: Template[] } {
    this.logger.log('Getting templates list');
    let templates = this.templateStore.getAll();
    if (type) {
      templates = templates.filter((t) => t.type === type);
    }
    return { templates };
  }

  async getTemplate(templateId: string): Promise<Template> {
    this.logger.log(`Getting template: ${templateId}`);
    const template = await this.templateStore.getById(templateId);
    if (!template) {
      throw new NotFoundException('Template not found in database');
    }
    return template;
  }

  createTemplate(body: CreateTemplateRequest): Promise<Template> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const template: StoredTemplate = {
      id,
      name: body.name,
      description: body.description,
      type: body.type,
      subject: body.subject,
      body: body.body,
      personalisation: body.personalisation,
      active: body.active ?? true,
      engine: body.engine,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.templateStore.set(id, template);
    this.logger.log(`Created template: ${id}`);
    return Promise.resolve(template);
  }

  async updateTemplate(
    templateId: string,
    body: UpdateTemplateRequest,
  ): Promise<Template> {
    const existing = await this.templateStore.getById(templateId);
    if (!existing) {
      throw new NotFoundException('Template not found in database');
    }
    const stored = existing;
    const updated: StoredTemplate = {
      ...stored,
      ...body,
      updated_at: new Date().toISOString(),
      version: stored.version + 1,
    };
    this.templateStore.set(templateId, updated);
    this.logger.log(`Updated template: ${templateId}`);
    return updated;
  }

  deleteTemplate(templateId: string): Promise<void> {
    if (!this.templateStore.has(templateId)) {
      return Promise.reject(
        new NotFoundException('Template not found in database'),
      );
    }
    this.templateStore.delete(templateId);
    this.logger.log(`Deleted template: ${templateId}`);
    return Promise.resolve();
  }
}
