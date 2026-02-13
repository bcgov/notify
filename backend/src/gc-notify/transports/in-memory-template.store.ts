import { Injectable } from '@nestjs/common';
import { TemplateDefinition } from './interfaces';

export interface StoredTemplate extends TemplateDefinition {
  version: number;
  created_at: string;
  updated_at: string;
  description?: string;
}

@Injectable()
export class InMemoryTemplateStore {
  private readonly templates = new Map<string, StoredTemplate>();

  getById(id: string): Promise<StoredTemplate | null> {
    const template = this.templates.get(id);
    return Promise.resolve(template ?? null);
  }

  set(id: string, template: StoredTemplate): void {
    this.templates.set(id, template);
  }

  delete(id: string): boolean {
    return this.templates.delete(id);
  }

  getAll(): StoredTemplate[] {
    return Array.from(this.templates.values());
  }

  has(id: string): boolean {
    return this.templates.has(id);
  }
}
