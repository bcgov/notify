import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryContextService } from '../../../src/common/delivery-context/delivery-context.service';
import { DeliveryContextStorage } from '../../../src/common/delivery-context/delivery-context.storage';

describe('DeliveryContextService', () => {
  let service: DeliveryContextService;
  let storage: DeliveryContextStorage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeliveryContextService, DeliveryContextStorage],
    }).compile();

    service = module.get(DeliveryContextService);
    storage = module.get(DeliveryContextStorage);
  });

  it('getEmailAdapterKey returns context emailAdapter', () => {
    const ctx = {
      emailAdapter: 'ches',
      smsAdapter: 'twilio',
      templateSource: 'local',
      templateEngine: 'jinja2',
    };

    storage.run(ctx, () => {
      expect(service.getEmailAdapterKey()).toBe('ches');
    });
  });

  it('getSmsAdapterKey returns context smsAdapter', () => {
    const ctx = {
      emailAdapter: 'nodemailer',
      smsAdapter: 'gc-notify',
      templateSource: 'local',
      templateEngine: 'handlebars',
    };

    storage.run(ctx, () => {
      expect(service.getSmsAdapterKey()).toBe('gc-notify');
    });
  });

  it('getTemplateSource returns context templateSource or local', () => {
    storage.run(
      { emailAdapter: 'nodemailer', smsAdapter: 'twilio', templateSource: 'local' },
      () => {
        expect(service.getTemplateSource()).toBe('local');
      },
    );

    storage.run(
      {
        emailAdapter: 'nodemailer',
        smsAdapter: 'twilio',
        templateSource: 'gc-notify-api',
      },
      () => {
        expect(service.getTemplateSource()).toBe('gc-notify-api');
      },
    );
  });

  it('getTemplateEngine returns context templateEngine or jinja2', () => {
    storage.run(
      {
        emailAdapter: 'nodemailer',
        smsAdapter: 'twilio',
        templateEngine: 'handlebars',
      },
      () => {
        expect(service.getTemplateEngine()).toBe('handlebars');
      },
    );

    storage.run(
      { emailAdapter: 'nodemailer', smsAdapter: 'twilio' },
      () => {
        expect(service.getTemplateEngine()).toBe('jinja2');
      },
    );
  });

  it('throws when context is not set', () => {
    expect(() => service.getEmailAdapterKey()).toThrow(
      'DeliveryContext is not set. Ensure DeliveryContextMiddleware runs before route handlers.',
    );
  });
});
