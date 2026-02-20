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
  Identity,
  CreateIdentityRequest,
  UpdateIdentityRequest,
} from './v1/core/schemas';

function toIdentity(stored: StoredSender): Identity {
  return {
    id: stored.id,
    type: stored.type,
    emailAddress: stored.email_address,
    smsSender: stored.sms_sender,
    createdAt: stored.created_at,
    updatedAt: stored.updated_at,
  };
}

@Injectable()
export class IdentitiesService {
  private readonly logger = new Logger(IdentitiesService.name);

  constructor(
    @Inject(SENDER_STORE) private readonly senderStore: ISenderStore,
  ) {}

  getIdentities(
    type?: 'email' | 'sms' | 'email+sms',
  ): Promise<{ identities: Identity[] }> {
    this.logger.log('Getting identities list');
    let senders = this.senderStore.getAll();
    if (type) {
      senders = senders.filter(
        (s) => s.type === type || s.type === 'email+sms',
      );
    }
    const identities = senders.map(toIdentity);
    return Promise.resolve({ identities });
  }

  async getIdentity(identityId: string): Promise<Identity> {
    this.logger.log(`Getting identity: ${identityId}`);
    const stored = await this.senderStore.getById(identityId);
    if (!stored) {
      throw new NotFoundException('Identity not found');
    }
    return toIdentity(stored);
  }

  async findById(identityId: string): Promise<StoredSender | null> {
    return this.senderStore.getById(identityId);
  }

  getDefaultIdentity(type: 'email' | 'sms'): StoredSender | null {
    const def = this.senderStore
      .getAll()
      .find((s) => (s.type === type || s.type === 'email+sms') && s.is_default);
    return def ?? null;
  }

  createIdentity(body: CreateIdentityRequest): Promise<Identity> {
    this.validateIdentityFields(body);
    const id = uuidv4();
    const now = new Date().toISOString();
    const stored: StoredSender = {
      id,
      type: body.type,
      email_address: body.emailAddress,
      sms_sender: body.smsSender,
      is_default: body.isDefault ?? false,
      created_at: now,
      updated_at: now,
    };
    this.senderStore.set(id, stored);
    this.logger.log(`Created identity: ${id}`);
    return Promise.resolve(toIdentity(stored));
  }

  async updateIdentity(
    identityId: string,
    body: UpdateIdentityRequest,
  ): Promise<Identity> {
    const existing = await this.senderStore.getById(identityId);
    if (!existing) {
      throw new NotFoundException('Identity not found');
    }
    const merged = {
      type: existing.type,
      emailAddress: body.emailAddress ?? existing.email_address,
      smsSender: body.smsSender ?? existing.sms_sender,
      isDefault:
        (body as CreateIdentityRequest & { isDefault?: boolean }).isDefault ??
        existing.is_default,
    };
    this.validateIdentityFields(merged as CreateIdentityRequest);
    const updated: StoredSender = {
      ...existing,
      email_address: merged.emailAddress,
      sms_sender: merged.smsSender,
      is_default: merged.isDefault,
      updated_at: new Date().toISOString(),
    };
    this.senderStore.set(identityId, updated);
    this.logger.log(`Updated identity: ${identityId}`);
    return toIdentity(updated);
  }

  deleteIdentity(identityId: string): Promise<void> {
    if (!this.senderStore.has(identityId)) {
      return Promise.reject(new NotFoundException('Identity not found'));
    }
    this.senderStore.delete(identityId);
    this.logger.log(`Deleted identity: ${identityId}`);
    return Promise.resolve();
  }

  private validateIdentityFields(body: CreateIdentityRequest): void {
    if (body.type === 'email' || body.type === 'email+sms') {
      if (!body.emailAddress) {
        throw new BadRequestException(
          'emailAddress is required when type is email or email+sms',
        );
      }
    }
    if (body.type === 'sms' || body.type === 'email+sms') {
      if (!body.smsSender) {
        throw new BadRequestException(
          'smsSender is required when type is sms or email+sms',
        );
      }
    }
  }
}
