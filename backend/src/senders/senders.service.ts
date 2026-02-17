import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SENDER_STORE } from '../adapters/tokens';
import type { ISenderStore, StoredSender } from '../adapters/interfaces';
import {
  Sender,
  CreateSenderRequest,
  UpdateSenderRequest,
} from './v1/core/schemas';

@Injectable()
export class SendersService {
  private readonly logger = new Logger(SendersService.name);

  constructor(
    @Inject(SENDER_STORE) private readonly senderStore: ISenderStore,
  ) {}

  getSenders(
    type?: 'email' | 'sms' | 'email+sms',
  ): Promise<{ senders: Sender[] }> {
    this.logger.log('Getting senders list');
    let senders = this.senderStore.getAll();
    if (type) {
      senders = senders.filter(
        (s) => s.type === type || s.type === 'email+sms',
      );
    }
    return Promise.resolve({ senders });
  }

  async getSender(senderId: string): Promise<Sender> {
    this.logger.log(`Getting sender: ${senderId}`);
    const sender = await this.senderStore.getById(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }
    return sender;
  }

  /**
   * Find sender by ID without throwing. Used by gc-notify for resolveEmailSender/resolveSmsSender.
   */
  async findById(senderId: string): Promise<StoredSender | null> {
    return this.senderStore.getById(senderId);
  }

  /**
   * Get default sender for email or SMS. Used by gc-notify when resolving senders.
   */
  getDefaultSender(type: 'email' | 'sms'): StoredSender | null {
    const defaultSender = this.senderStore
      .getAll()
      .find((s) => (s.type === type || s.type === 'email+sms') && s.is_default);
    return defaultSender ?? null;
  }

  createSender(body: CreateSenderRequest): Promise<Sender> {
    this.validateSenderFields(body);
    const isDefault = body.is_default ?? false;
    if (isDefault) {
      this.clearDefaultForType(body.type);
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const sender: StoredSender = {
      id,
      type: body.type,
      email_address: body.email_address,
      sms_sender: body.sms_sender,
      is_default: isDefault,
      created_at: now,
      updated_at: now,
    };
    this.senderStore.set(id, sender);
    this.logger.log(`Created sender: ${id}`);
    return Promise.resolve(sender);
  }

  async updateSender(
    senderId: string,
    body: UpdateSenderRequest,
  ): Promise<Sender> {
    const existing = await this.senderStore.getById(senderId);
    if (!existing) {
      throw new NotFoundException('Sender not found');
    }
    const merged = { ...existing, ...body };
    this.validateSenderFields(merged as CreateSenderRequest);
    if (body.is_default === true) {
      this.clearDefaultForType(existing.type, senderId);
    }
    const updated: StoredSender = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString(),
    };
    this.senderStore.set(senderId, updated);
    this.logger.log(`Updated sender: ${senderId}`);
    return updated;
  }

  /**
   * Clear is_default on other senders of the same type so only one default exists per type.
   * Excludes the given senderId when updating (used when setting a sender as default).
   */
  private clearDefaultForType(
    type: 'email' | 'sms' | 'email+sms',
    excludeId?: string,
  ): void {
    const senders = this.senderStore.getAll();
    for (const s of senders) {
      if (s.id === excludeId) continue;
      const matchesType =
        s.type === type || s.type === 'email+sms';
      if (matchesType && s.is_default) {
        this.senderStore.set(s.id, {
          ...s,
          is_default: false,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  deleteSender(senderId: string): Promise<void> {
    if (!this.senderStore.has(senderId)) {
      return Promise.reject(new NotFoundException('Sender not found'));
    }
    this.senderStore.delete(senderId);
    this.logger.log(`Deleted sender: ${senderId}`);
    return Promise.resolve();
  }

  private validateSenderFields(body: CreateSenderRequest): void {
    if (body.type === 'email' || body.type === 'email+sms') {
      if (!body.email_address) {
        throw new BadRequestException(
          'email_address is required when type is email or email+sms',
        );
      }
    }
    if (body.type === 'sms' || body.type === 'email+sms') {
      if (!body.sms_sender) {
        throw new BadRequestException(
          'sms_sender is required when type is sms or email+sms',
        );
      }
    }
  }
}
