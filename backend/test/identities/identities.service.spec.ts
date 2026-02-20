import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { IdentitiesService } from '../../src/identities/identities.service';
import { SENDER_STORE } from '../../src/adapters/tokens';
import { InMemorySenderStore } from '../../src/adapters/implementations/storage/in-memory/in-memory-sender.store';

describe('IdentitiesService', () => {
  let service: IdentitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentitiesService,
        { provide: SENDER_STORE, useClass: InMemorySenderStore },
      ],
    }).compile();

    service = module.get(IdentitiesService);
  });

  it('getIdentities returns all identities when no type filter', async () => {
    const s1 = await service.createIdentity({
      type: 'email',
      emailAddress: 'a@gov.bc.ca',
    });
    const s2 = await service.createIdentity({
      type: 'sms',
      smsSender: 'GOVBC',
    });

    const result = await service.getIdentities();
    expect(result.identities).toHaveLength(2);
    expect(result.identities.map((s) => s.id)).toContain(s1.id);
    expect(result.identities.map((s) => s.id)).toContain(s2.id);
  });

  it('getIdentities filters by type when type provided', async () => {
    await service.createIdentity({
      type: 'email',
      emailAddress: 'a@gov.bc.ca',
    });
    const smsId = await service.createIdentity({
      type: 'sms',
      smsSender: 'GOVBC',
    });

    const result = await service.getIdentities('sms');
    expect(result.identities).toHaveLength(1);
    expect(result.identities[0].id).toBe(smsId.id);
    expect(result.identities[0].type).toBe('sms');
  });

  it('getIdentities includes email+sms when filtering by email', async () => {
    const combined = await service.createIdentity({
      type: 'email+sms',
      emailAddress: 'x@gov.bc.ca',
      smsSender: 'GOVBC',
    });

    const result = await service.getIdentities('email');
    expect(result.identities).toHaveLength(1);
    expect(result.identities[0].id).toBe(combined.id);
  });

  it('getIdentity returns identity when found', async () => {
    const created = await service.createIdentity({
      type: 'email',
      emailAddress: 'noreply@gov.bc.ca',
    });

    const result = await service.getIdentity(created.id);
    expect(result.id).toBe(created.id);
    expect(result.emailAddress).toBe('noreply@gov.bc.ca');
    expect(result.type).toBe('email');
  });

  it('getIdentity throws NotFoundException when not found', async () => {
    await expect(service.getIdentity('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('createIdentity returns identity with id and timestamps', async () => {
    const result = await service.createIdentity({
      type: 'email',
      emailAddress: 'noreply@gov.bc.ca',
    });

    expect(result.id).toBeDefined();
    expect(result.type).toBe('email');
    expect(result.emailAddress).toBe('noreply@gov.bc.ca');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('createIdentity sets isDefault when provided', async () => {
    const result = await service.createIdentity({
      type: 'email',
      emailAddress: 'default@gov.bc.ca',
      isDefault: true,
    });

    const def = service.getDefaultIdentity('email');
    expect(def?.id).toBe(result.id);
  });

  it('createIdentity defaults isDefault to false', async () => {
    await service.createIdentity({
      type: 'email',
      emailAddress: 'x@gov.bc.ca',
    });

    const def = service.getDefaultIdentity('email');
    expect(def).toBeNull();
  });

  it('createIdentity throws when email type missing emailAddress', () => {
    expect(() =>
      service.createIdentity({ type: 'email' } as Parameters<
        typeof service.createIdentity
      >[0]),
    ).toThrow(BadRequestException);
  });

  it('createIdentity throws when sms type missing smsSender', () => {
    expect(() =>
      service.createIdentity({ type: 'sms' } as Parameters<
        typeof service.createIdentity
      >[0]),
    ).toThrow(BadRequestException);
  });

  it('createIdentity throws when email+sms type missing emailAddress', () => {
    expect(() =>
      service.createIdentity({
        type: 'email+sms',
        smsSender: 'GOVBC',
      }),
    ).toThrow(BadRequestException);
  });

  it('createIdentity throws when email+sms type missing smsSender', () => {
    expect(() =>
      service.createIdentity({
        type: 'email+sms',
        emailAddress: 'x@gov.bc.ca',
      }),
    ).toThrow(BadRequestException);
  });

  it('updateIdentity returns updated identity', async () => {
    const created = await service.createIdentity({
      type: 'email',
      emailAddress: 'old@gov.bc.ca',
    });

    const result = await service.updateIdentity(created.id, {
      emailAddress: 'new@gov.bc.ca',
    });

    expect(result.emailAddress).toBe('new@gov.bc.ca');
    expect(result.id).toBe(created.id);
  });

  it('updateIdentity throws NotFoundException when not found', async () => {
    await expect(
      service.updateIdentity('missing', { emailAddress: 'x@gov.bc.ca' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteIdentity removes identity', async () => {
    const created = await service.createIdentity({
      type: 'email',
      emailAddress: 'x@gov.bc.ca',
    });

    await service.deleteIdentity(created.id);

    await expect(service.getIdentity(created.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('deleteIdentity throws NotFoundException when not found', async () => {
    await expect(service.deleteIdentity('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getDefaultIdentity returns identity marked isDefault for type', async () => {
    await service.createIdentity({
      type: 'email',
      emailAddress: 'a@gov.bc.ca',
    });
    const defaultId = await service.createIdentity({
      type: 'email',
      emailAddress: 'default@gov.bc.ca',
      isDefault: true,
    });

    const result = service.getDefaultIdentity('email');
    expect(result?.id).toBe(defaultId.id);
    expect(result?.email_address).toBe('default@gov.bc.ca');
  });

  it('getDefaultIdentity returns null when no default exists', () => {
    const result = service.getDefaultIdentity('email');
    expect(result).toBeNull();
  });
});
