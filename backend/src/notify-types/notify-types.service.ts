import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryNotifyTypeStore } from './stores/in-memory-notify-type.store';
import type {
  NotifyType,
  CreateNotifyTypeRequest,
  UpdateNotifyTypeRequest,
} from './v1/core/schemas';

@Injectable()
export class NotifyTypesService {
  private readonly logger = new Logger(NotifyTypesService.name);

  constructor(private readonly store: InMemoryNotifyTypeStore) {}

  getNotifyTypes(): { notifyTypes: NotifyType[] } {
    return { notifyTypes: this.store.getAll() };
  }

  getNotifyType(id: string): NotifyType {
    const nt = this.store.getById(id);
    if (!nt) throw new NotFoundException('Notify type not found');
    return nt;
  }

  getByCode(code: string): NotifyType | undefined {
    return this.store.getByCode(code);
  }

  createNotifyType(body: CreateNotifyTypeRequest): NotifyType {
    const existing = this.store.getByCode(body.code);
    if (existing) {
      throw new ConflictException(
        `Notify type with code "${body.code}" already exists`,
      );
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const nt: NotifyType = {
      id,
      code: body.code,
      sendAs: body.sendAs,
      templateId: body.templateId,
      identityId: body.identityId,
      renderer: body.renderer,
      subject: body.subject,
      body: body.body,
      params: body.params,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(nt);
    this.logger.log(`Created notify type: ${id} (${body.code})`);
    return nt;
  }

  updateNotifyType(id: string, body: UpdateNotifyTypeRequest): NotifyType {
    const existing = this.store.getById(id);
    if (!existing) throw new NotFoundException('Notify type not found');
    if (body.code !== undefined && body.code !== existing.code) {
      const byCode = this.store.getByCode(body.code);
      if (byCode && byCode.id !== id) {
        throw new ConflictException(
          `Notify type with code "${body.code}" already exists`,
        );
      }
    }
    const updated: NotifyType = {
      ...existing,
      ...body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(updated);
    this.logger.log(`Updated notify type: ${id}`);
    return updated;
  }

  deleteNotifyType(id: string): void {
    if (!this.store.has(id)) {
      throw new NotFoundException('Notify type not found');
    }
    this.store.delete(id);
    this.logger.log(`Deleted notify type: ${id}`);
  }
}
