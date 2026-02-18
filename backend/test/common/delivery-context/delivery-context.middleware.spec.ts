import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DeliveryContextMiddleware } from '../../../src/common/delivery-context/delivery-context.middleware';
import { DeliveryContextStorage } from '../../../src/common/delivery-context/delivery-context.storage';
import type { Request, Response } from 'express';

describe('DeliveryContextMiddleware', () => {
  let middleware: DeliveryContextMiddleware;
  let storage: DeliveryContextStorage;
  let configGetMock: jest.Mock;

  beforeEach(async () => {
    configGetMock = jest.fn((key: string, fallback?: string) => {
      if (key === 'delivery.email') return fallback ?? 'nodemailer';
      if (key === 'delivery.sms') return fallback ?? 'twilio';
      if (key === 'gcNotify.defaultTemplateEngine') return fallback ?? 'jinja2';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryContextMiddleware,
        { provide: ConfigService, useValue: { get: configGetMock } },
        DeliveryContextStorage,
      ],
    }).compile();

    middleware = module.get(DeliveryContextMiddleware);
    storage = module.get(DeliveryContextStorage);
  });

  const createReq = (headers: Record<string, string> = {}): Request =>
    ({ headers }) as Request;
  const createRes = (): Response => ({}) as Response;
  const createNext = () => jest.fn();

  it('uses system config when no headers present', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('nodemailer');
      expect(ctx.smsAdapter).toBe('twilio');
      expect(ctx.templateEngine).toBe('jinja2');
      expect(ctx.templateSource).toBe('local');
      return fn();
    });

    middleware.use(createReq(), createRes(), createNext());

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('uses X-Delivery-Email-Adapter when present and valid', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('ches');
      expect(ctx.smsAdapter).toBe('twilio');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-email-adapter': 'ches' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('uses X-Delivery-Sms-Adapter when present and valid', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('nodemailer');
      expect(ctx.smsAdapter).toBe('gc-notify:passthrough');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-sms-adapter': 'gc-notify:passthrough' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('uses both headers when present', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('gc-notify:passthrough');
      expect(ctx.smsAdapter).toBe('gc-notify:passthrough');
      return fn();
    });

    middleware.use(
      createReq({
        'x-delivery-email-adapter': 'gc-notify:passthrough',
        'x-delivery-sms-adapter': 'gc-notify:passthrough',
      }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('ignores gc-notify without passthrough and falls back to config', (done) => {
    configGetMock.mockImplementation((key: string) => {
      if (key === 'delivery.email') return 'nodemailer';
      if (key === 'delivery.sms') return 'twilio';
      if (key === 'gcNotify.defaultTemplateEngine') return 'jinja2';
      return undefined;
    });

    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('nodemailer');
      expect(ctx.smsAdapter).toBe('twilio');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-email-adapter': 'gc-notify' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('accepts ches:passthrough for email', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('ches:passthrough');
      expect(ctx.smsAdapter).toBe('twilio');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-email-adapter': 'ches:passthrough' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('ignores invalid X-Delivery-Email-Adapter and falls back to config', (done) => {
    configGetMock.mockImplementation((key: string) => {
      if (key === 'delivery.email') return 'nodemailer';
      if (key === 'delivery.sms') return 'twilio';
      if (key === 'gcNotify.defaultTemplateEngine') return 'jinja2';
      return undefined;
    });

    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('nodemailer');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-email-adapter': 'invalid-adapter' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('normalizes header value to lowercase', (done) => {
    const runSpy = jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      expect(ctx.emailAdapter).toBe('ches');
      return fn();
    });

    middleware.use(
      createReq({ 'x-delivery-email-adapter': 'CHES' }),
      createRes(),
      createNext(),
    );

    expect(runSpy).toHaveBeenCalled();
    runSpy.mockRestore();
    done();
  });

  it('calls next() within storage.run', (done) => {
    const next = createNext();
    let ctxInsideNext: unknown = null;

    jest.spyOn(storage, 'run').mockImplementation((ctx, fn) => {
      ctxInsideNext = ctx;
      return fn();
    });

    middleware.use(createReq(), createRes(), next);

    expect(next).toHaveBeenCalled();
    expect(ctxInsideNext).toBeDefined();
    done();
  });
});
