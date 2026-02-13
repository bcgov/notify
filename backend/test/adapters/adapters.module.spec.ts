import { AdaptersModule } from '../../src/adapters/adapters.module';
import { EMAIL_ADAPTER, SMS_ADAPTER } from '../../src/adapters/tokens';
import { NodemailerEmailTransport } from '../../src/adapters/implementations/delivery/email/nodemailer/nodemailer-email.adapter';
import { TwilioSmsTransport } from '../../src/adapters/implementations/delivery/sms/twilio/twilio-sms.adapter';

describe('AdaptersModule', () => {
  it('forRoot returns dynamic module with default adapters when no options', () => {
    const dynamic = AdaptersModule.forRoot();

    expect(dynamic.module).toBe(AdaptersModule);
    expect(dynamic.global).toBe(true);
    expect(dynamic.providers).toHaveLength(2);
    expect(dynamic.exports).toEqual([EMAIL_ADAPTER, SMS_ADAPTER]);

    const emailProvider = dynamic.providers?.[0] as {
      provide: symbol;
      useClass: unknown;
    };
    const smsProvider = dynamic.providers?.[1] as {
      provide: symbol;
      useClass: unknown;
    };

    expect(emailProvider.provide).toBe(EMAIL_ADAPTER);
    expect(emailProvider.useClass).toBe(NodemailerEmailTransport);
    expect(smsProvider.provide).toBe(SMS_ADAPTER);
    expect(smsProvider.useClass).toBe(TwilioSmsTransport);
  });

  it('forRoot uses custom adapters when provided', () => {
    class CustomEmailAdapter {}
    class CustomSmsAdapter {}

    const dynamic = AdaptersModule.forRoot({
      emailAdapter: CustomEmailAdapter,
      smsAdapter: CustomSmsAdapter,
    });

    const emailProvider = dynamic.providers?.[0] as {
      provide: symbol;
      useClass: unknown;
    };
    const smsProvider = dynamic.providers?.[1] as {
      provide: symbol;
      useClass: unknown;
    };

    expect(emailProvider.useClass).toBe(CustomEmailAdapter);
    expect(smsProvider.useClass).toBe(CustomSmsAdapter);
  });
});
