import { DynamicModule, Module, Type } from '@nestjs/common';
import { NodemailerEmailTransport } from './nodemailer/nodemailer-email.transport';
import { TwilioSmsTransport } from './twilio/twilio-sms.transport';
import { EMAIL_TRANSPORT, SMS_TRANSPORT } from './tokens';
import type { IEmailTransport, ISmsTransport } from './interfaces';

export interface TransportsModuleOptions {
  emailTransport?: Type<IEmailTransport>;
  smsTransport?: Type<ISmsTransport>;
}

/**
 * Shared transports module - provides email and SMS transports for use by
 * gc-notify, notifications, and other API packages.
 */
@Module({})
export class TransportsModule {
  static forRoot(options: TransportsModuleOptions = {}): DynamicModule {
    const emailTransport = options.emailTransport ?? NodemailerEmailTransport;
    const smsTransport = options.smsTransport ?? TwilioSmsTransport;

    return {
      module: TransportsModule,
      global: true,
      providers: [
        { provide: EMAIL_TRANSPORT, useClass: emailTransport },
        { provide: SMS_TRANSPORT, useClass: smsTransport },
      ],
      exports: [EMAIL_TRANSPORT, SMS_TRANSPORT],
    };
  }
}
