import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NotifyTypesService } from '../../src/notify-types/notify-types.service';
import { InMemoryNotifyTypeStore } from '../../src/notify-types/stores/in-memory-notify-type.store';

describe('NotifyTypesService', () => {
  let service: NotifyTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotifyTypesService, InMemoryNotifyTypeStore],
    }).compile();

    service = module.get(NotifyTypesService);
  });

  it('createNotifyType returns notify type with id and code', () => {
    const result = service.createNotifyType({
      code: 'single-email',
      sendAs: 'email',
    });

    expect(result.id).toBeDefined();
    expect(result.code).toBe('single-email');
    expect(result.sendAs).toBe('email');
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('createNotifyType throws ConflictException when code exists', () => {
    service.createNotifyType({ code: 'dup' });

    expect(() => service.createNotifyType({ code: 'dup' })).toThrow(
      ConflictException,
    );
  });

  it('getNotifyTypes returns list of notify types', () => {
    service.createNotifyType({ code: 'a' });
    service.createNotifyType({ code: 'b' });

    const result = service.getNotifyTypes();
    expect(result.notifyTypes).toHaveLength(2);
  });

  it('getNotifyType returns notify type when found', () => {
    const created = service.createNotifyType({ code: 'x', sendAs: 'email' });

    const result = service.getNotifyType(created.id);
    expect(result.id).toBe(created.id);
    expect(result.code).toBe('x');
  });

  it('getNotifyType throws NotFoundException when not found', () => {
    expect(() => service.getNotifyType('missing')).toThrow(NotFoundException);
  });

  it('getByCode returns notify type when found', () => {
    const created = service.createNotifyType({ code: 'lookup' });

    const result = service.getByCode('lookup');
    expect(result?.id).toBe(created.id);
    expect(result?.code).toBe('lookup');
  });

  it('getByCode returns undefined when not found', () => {
    const result = service.getByCode('missing');
    expect(result).toBeUndefined();
  });

  it('updateNotifyType returns updated notify type', () => {
    const created = service.createNotifyType({ code: 'old', sendAs: 'email' });

    const result = service.updateNotifyType(created.id, { sendAs: 'sms' });

    expect(result.id).toBe(created.id);
    expect(result.sendAs).toBe('sms');
    expect(result.code).toBe('old');
  });

  it('updateNotifyType throws NotFoundException when not found', () => {
    expect(() =>
      service.updateNotifyType('missing', { sendAs: 'email' }),
    ).toThrow(NotFoundException);
  });

  it('deleteNotifyType removes notify type', () => {
    const created = service.createNotifyType({ code: 'del' });

    service.deleteNotifyType(created.id);

    expect(() => service.getNotifyType(created.id)).toThrow(NotFoundException);
  });

  it('deleteNotifyType throws NotFoundException when not found', () => {
    expect(() => service.deleteNotifyType('missing')).toThrow(
      NotFoundException,
    );
  });
});
