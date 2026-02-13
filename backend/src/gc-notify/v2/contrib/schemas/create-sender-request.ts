import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsIn,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request schema for creating a sender.
 * Extension: Management schema - not part of the official GC Notify API.
 */
export class CreateSenderRequest {
  @ApiProperty({
    description: 'Sender type',
    enum: ['email', 'sms', 'email+sms'],
  })
  @IsIn(['email', 'sms', 'email+sms'])
  type: 'email' | 'sms' | 'email+sms';

  @ApiPropertyOptional({
    description:
      'Email address for reply-to (required when type is email or email+sms)',
    example: 'noreply@gov.bc.ca',
  })
  @ValidateIf(
    (o: CreateSenderRequest) => o.type === 'email' || o.type === 'email+sms',
  )
  @IsEmail()
  email_address?: string;

  @ApiPropertyOptional({
    description:
      'SMS sender - required when type is sms or email+sms. Accepts either: (1) Alphanumeric sender ID (e.g. GOVBC, 1-11 chars) shown as sender name, or (2) E.164 phone number (e.g. +15551234567) for sender display.',
    examples: {
      alphanumeric: { summary: 'Alphanumeric sender ID', value: 'GOVBC' },
      e164: { summary: 'E.164 phone number', value: '+15551234567' },
    },
  })
  @ValidateIf(
    (o: CreateSenderRequest) => o.type === 'sms' || o.type === 'email+sms',
  )
  @IsString()
  @Matches(/^[\dA-Za-z+]{1,15}$/, {
    message:
      'SMS sender must be alphanumeric (max 11 chars) or E.164 phone number (max 15 chars)',
  })
  sms_sender?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default sender for its type(s)',
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
