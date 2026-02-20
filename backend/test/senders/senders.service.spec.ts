import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SendersService } from '../../src/senders/senders.service';
import { SENDER_STORE } from '../../src/adapters/tokens';
import { InMemorySenderStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-sender.store';

describe('SendersService', () => {
  let service: SendersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendersService,
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();

    service = module.get(SendersService);
  });

  it('getSenders returns all senders when no type filter', async () => {
    const s1 = await service.createSender({
      type: 'email',
      email_address: 'a@gov.bc.ca',
    });
    const s2 = await service.createSender({
      type: 'sms',
      sms_sender: 'GOVBC',
    });

    const result = await service.getSenders();
    expect(result.senders).toHaveLength(2);
    expect(result.senders.map((s) => s.id)).toContain(s1.id);
    expect(result.senders.map((s) => s.id)).toContain(s2.id);
  });

  it('getSenders filters by type when type provided', async () => {
    await service.createSender({
      type: 'email',
      email_address: 'a@gov.bc.ca',
    });
    const smsSender = await service.createSender({
      type: 'sms',
      sms_sender: 'GOVBC',
    });

    const result = await service.getSenders('sms');
    expect(result.senders).toHaveLength(1);
    expect(result.senders[0].id).toBe(smsSender.id);
    expect(result.senders[0].type).toBe('sms');
  });

  it('getSenders includes email+sms senders when filtering by email', async () => {
    const combined = await service.createSender({
      type: 'email+sms',
      email_address: 'x@gov.bc.ca',
      sms_sender: 'GOVBC',
    });

    const result = await service.getSenders('email');
    expect(result.senders).toHaveLength(1);
    expect(result.senders[0].id).toBe(combined.id);
  });

  it('getSender returns sender when found', async () => {
    const created = await service.createSender({
      type: 'email',
      email_address: 'noreply@gov.bc.ca',
    });

    const result = await service.getSender(created.id);
    expect(result.id).toBe(created.id);
    expect(result.email_address).toBe('noreply@gov.bc.ca');
    expect(result.type).toBe('email');
  });

  it('getSender throws NotFoundException when not found', async () => {
    await expect(service.getSender('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createSender returns sender with id and timestamps', async () => {
    const result = await service.createSender({
      type: 'email',
      email_address: 'noreply@gov.bc.ca',
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe('email');
    expect(result.email_address).toBe('noreply@gov.bc.ca');
    expect(result.created_at).toBeDefined();
    expect(result.updated_at).toBeDefined();
  });

  it('createSender sets is_default when provided', async () => {
    const result = await service.createSender({
      type: 'email',
      email_address: 'default@gov.bc.ca',
      is_default: true,
    });

    expect(result.is_default).toBe(true);
  });

  it('createSender defaults is_default to false', async () => {
    const result = await service.createSender({
      type: 'email',
      email_address: 'x@gov.bc.ca',
    });

    expect(result.is_default).toBe(false);
  });

  it('createSender throws when email type missing email_address', () => {
    expect(() =>
      service.createSender({ type: 'email' } as Parameters<
        typeof service.createSender
      >[0]),
    ).toThrow(BadRequestException);
  });

  it('createSender throws when sms type missing sms_sender', () => {
    expect(() =>
      service.createSender({ type: 'sms' } as Parameters<
        typeof service.createSender
      >[0]),
    ).toThrow(BadRequestException);
  });

  it('createSender throws when email+sms type missing email_address', () => {
    expect(() =>
      service.createSender({
        type: 'email+sms',
        sms_sender: 'GOVBC',
      }),
    ).toThrow(BadRequestException);
  });

  it('createSender throws when email+sms type missing sms_sender', () => {
    expect(() =>
      service.createSender({
        type: 'email+sms',
        email_address: 'x@gov.bc.ca',
      }),
    ).toThrow(BadRequestException);
  });

  it('updateSender returns updated sender', async () => {
    const created = await service.createSender({
      type: 'email',
      email_address: 'old@gov.bc.ca',
    });

    const result = await service.updateSender(created.id, {
      email_address: 'new@gov.bc.ca',
    });

    expect(result.email_address).toBe('new@gov.bc.ca');
    expect(result.id).toBe(created.id);
  });

  it('updateSender throws NotFoundException when sender not found', async () => {
    await expect(
      service.updateSender('missing', { email_address: 'x@gov.bc.ca' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteSender removes sender', async () => {
    const created = await service.createSender({
      type: 'email',
      email_address: 'x@gov.bc.ca',
    });

    await service.deleteSender(created.id);

    await expect(service.getSender(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deleteSender throws NotFoundException when sender not found', async () => {
    await expect(service.deleteSender('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getDefaultSender returns sender marked is_default for type', async () => {
    await service.createSender({
      type: 'email',
      email_address: 'a@gov.bc.ca',
    });
    const defaultSender = await service.createSender({
      type: 'email',
      email_address: 'default@gov.bc.ca',
      is_default: true,
    });

    const result = service.getDefaultSender('email');
    expect(result?.id).toBe(defaultSender.id);
    expect(result?.email_address).toBe('default@gov.bc.ca');
  });

  it('getDefaultSender returns null when no default exists', () => {
    const result = service.getDefaultSender('email');
    expect(result).toBeNull();
  });
});
