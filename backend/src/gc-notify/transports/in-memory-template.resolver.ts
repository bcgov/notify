import { Injectable } from '@nestjs/common';
import { InMemoryTemplateStore } from './in-memory-template.store';
import { ITemplateResolver } from './interfaces';

@Injectable()
export class InMemoryTemplateResolver implements ITemplateResolver {
  readonly name = 'in-memory';

  constructor(private readonly store: InMemoryTemplateStore) {}

  async getById(templateId: string) {
    return this.store.getById(templateId);
  }
}
