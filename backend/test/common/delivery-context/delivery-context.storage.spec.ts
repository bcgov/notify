import { DeliveryContextStorage } from '../../../src/common/delivery-context/delivery-context.storage';

describe('DeliveryContextStorage', () => {
  let storage: DeliveryContextStorage;

  beforeEach(() => {
    storage = new DeliveryContextStorage();
  });

  it('get returns undefined when no context is set', () => {
    expect(storage.get()).toBeUndefined();
  });

  it('run executes fn with context and get returns context inside callback', () => {
    const ctx = {
      emailAdapter: 'ches',
      smsAdapter: 'twilio',
      templateSource: 'local',
      templateEngine: 'jinja2',
    };

    const result = storage.run(ctx, () => {
      expect(storage.get()).toEqual(ctx);
      return 'done';
    });

    expect(result).toBe('done');
  });

  it('get returns undefined after run completes', () => {
    const ctx = { emailAdapter: 'nodemailer', smsAdapter: 'twilio' };

    storage.run(ctx, () => {
      expect(storage.get()).toBeDefined();
    });

    expect(storage.get()).toBeUndefined();
  });

  it('nested run uses inner context', () => {
    const outer = { emailAdapter: 'nodemailer', smsAdapter: 'twilio' };
    const inner = { emailAdapter: 'ches', smsAdapter: 'gc-notify:passthrough' };

    storage.run(outer, () => {
      expect(storage.get()?.emailAdapter).toBe('nodemailer');

      storage.run(inner, () => {
        expect(storage.get()?.emailAdapter).toBe('ches');
        expect(storage.get()?.smsAdapter).toBe('gc-notify:passthrough');
      });

      expect(storage.get()?.emailAdapter).toBe('nodemailer');
    });
  });
});
