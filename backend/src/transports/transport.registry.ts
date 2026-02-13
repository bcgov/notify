import { Type } from '@nestjs/common';
import { NodemailerEmailTransport } from './nodemailer/nodemailer-email.transport';
import { TwilioSmsTransport } from './twilio/twilio-sms.transport';
import type { IEmailTransport, ISmsTransport } from './interfaces';

export const EMAIL_TRANSPORT_REGISTRY: Record<string, Type<IEmailTransport>> = {
  nodemailer: NodemailerEmailTransport,
};

export const SMS_TRANSPORT_REGISTRY: Record<string, Type<ISmsTransport>> = {
  twilio: TwilioSmsTransport,
};
