import { DynamicModule, Module, Type } from '@nestjs/common';
import { NodemailerEmailTransport } from './implementations/delivery/email/nodemailer/nodemailer-email.adapter';
import { TwilioSmsTransport } from './implementations/delivery/sms/twilio/twilio-sms.adapter';
import { EMAIL_ADAPTER, SMS_ADAPTER } from './tokens';
import type { IEmailTransport, ISmsTransport } from './interfaces';

export interface AdaptersModuleOptions {
  emailAdapter?: Type<IEmailTransport>;
  smsAdapter?: Type<ISmsTransport>;
}

/**
 * Shared adapters module - provides email and SMS delivery adapters for use by
 * gc-notify, notifications, and other API packages.
 */
@Module({})
export class AdaptersModule {
  static forRoot(options: AdaptersModuleOptions = {}): DynamicModule {
    const emailAdapter = options.emailAdapter ?? NodemailerEmailTransport;
    const smsAdapter = options.smsAdapter ?? TwilioSmsTransport;

    return {
      module: AdaptersModule,
      global: true,
      providers: [
        { provide: EMAIL_ADAPTER, useClass: emailAdapter },
        { provide: SMS_ADAPTER, useClass: smsAdapter },
      ],
      exports: [EMAIL_ADAPTER, SMS_ADAPTER],
    };
  }
}
