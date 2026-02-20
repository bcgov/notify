import { Injectable } from '@nestjs/common';
import type { NotifyType } from '../v1/core/schemas/notify-type';

@Injectable()
export class InMemoryNotifyTypeStore {
  private readonly byId = new Map<string, NotifyType>();
  private readonly byCode = new Map<string, string>();

  getById(id: string): NotifyType | undefined {
    return this.byId.get(id);
  }

  getByCode(code: string): NotifyType | undefined {
    const id = this.byCode.get(code);
    return id ? this.byId.get(id) : undefined;
  }

  getAll(): NotifyType[] {
    return Array.from(this.byId.values());
  }

  set(notifyType: NotifyType): void {
    const existing = this.byId.get(notifyType.id);
    if (existing && existing.code !== notifyType.code) {
      this.byCode.delete(existing.code);
    }
    this.byId.set(notifyType.id, notifyType);
    this.byCode.set(notifyType.code, notifyType.id);
  }

  delete(id: string): boolean {
    const nt = this.byId.get(id);
    if (!nt) return false;
    this.byId.delete(id);
    this.byCode.delete(nt.code);
    return true;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }
}
