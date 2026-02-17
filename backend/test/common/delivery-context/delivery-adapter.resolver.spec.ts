import { Test, TestingModule } from '@nestjs/testing';
import {
  DeliveryAdapterResolver,
  GC_NOTIFY_CLIENT,
} from '../../../src/common/delivery-context/delivery-adapter.resolver';
import { DeliveryContextService } from '../../../src/common/delivery-context/delivery-context.service';
import {
  EMAIL_ADAPTER_MAP,
  SMS_ADAPTER_MAP,
} from '../../../src/adapters/tokens';
import type {
  IEmailTransport,
  ISmsTransport,
} from '../../../src/adapters/interfaces';

describe('DeliveryAdapterResolver', () => {
  let resolver: DeliveryAdapterResolver;
  let contextService: {
    getEmailAdapterKey: jest.Mock;
    getSmsAdapterKey: jest.Mock;
  };
  const mockChes = {
    name: 'ches',
    send: jest.fn(),
  } as unknown as IEmailTransport;
  const mockNodemailer = {
    name: 'nodemailer',
    send: jest.fn(),
  } as unknown as IEmailTransport;
  const mockTwilio = {
    name: 'twilio',
    send: jest.fn(),
  } as unknown as ISmsTransport;

  const emailMap: Record<string, IEmailTransport> = {
    ches: mockChes,
    nodemailer: mockNodemailer,
  };
  const smsMap: Record<string, ISmsTransport> = {
    twilio: mockTwilio,
  };

  beforeEach(async () => {
    contextService = {
      getEmailAdapterKey: jest.fn(),
      getSmsAdapterKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryAdapterResolver,
        { provide: DeliveryContextService, useValue: contextService },
        { provide: EMAIL_ADAPTER_MAP, useValue: emailMap },
        { provide: SMS_ADAPTER_MAP, useValue: smsMap },
      ],
    }).compile();

    resolver = module.get(DeliveryAdapterResolver);
  });

  describe('getEmailAdapter', () => {
    it('returns GC_NOTIFY_CLIENT when key is gc-notify', () => {
      contextService.getEmailAdapterKey.mockReturnValue('gc-notify');

      expect(resolver.getEmailAdapter()).toBe(GC_NOTIFY_CLIENT);
    });

    it('returns ches adapter when key is ches', () => {
      contextService.getEmailAdapterKey.mockReturnValue('ches');

      expect(resolver.getEmailAdapter()).toBe(mockChes);
    });

    it('returns nodemailer adapter when key is nodemailer', () => {
      contextService.getEmailAdapterKey.mockReturnValue('nodemailer');

      expect(resolver.getEmailAdapter()).toBe(mockNodemailer);
    });

    it('falls back to nodemailer when key is unknown', () => {
      contextService.getEmailAdapterKey.mockReturnValue('unknown');

      expect(resolver.getEmailAdapter()).toBe(mockNodemailer);
    });
  });

  describe('getSmsAdapter', () => {
    it('returns GC_NOTIFY_CLIENT when key is gc-notify', () => {
      contextService.getSmsAdapterKey.mockReturnValue('gc-notify');

      expect(resolver.getSmsAdapter()).toBe(GC_NOTIFY_CLIENT);
    });

    it('returns twilio adapter when key is twilio', () => {
      contextService.getSmsAdapterKey.mockReturnValue('twilio');

      expect(resolver.getSmsAdapter()).toBe(mockTwilio);
    });

    it('falls back to twilio when key is unknown', () => {
      contextService.getSmsAdapterKey.mockReturnValue('unknown');

      expect(resolver.getSmsAdapter()).toBe(mockTwilio);
    });
  });
});
