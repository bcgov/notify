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

export class CreateIdentityRequest {
  @ApiProperty({
    description: 'Identity type',
    enum: ['email', 'sms', 'email+sms'],
  })
  @IsIn(['email', 'sms', 'email+sms'])
  type: 'email' | 'sms' | 'email+sms';

  @ApiPropertyOptional({
    description: 'Email address (required when type is email or email+sms)',
    example: 'noreply@gov.bc.ca',
  })
  @ValidateIf(
    (o: CreateIdentityRequest) => o.type === 'email' || o.type === 'email+sms',
  )
  @IsEmail()
  emailAddress?: string;

  @ApiPropertyOptional({
    description:
      'SMS sender - required when type is sms or email+sms. Alphanumeric sender ID or E.164 phone number.',
    examples: {
      alphanumeric: { summary: 'Alphanumeric sender ID', value: 'GOVBC' },
      e164: { summary: 'E.164 phone number', value: '+15551234567' },
    },
  })
  @ValidateIf(
    (o: CreateIdentityRequest) => o.type === 'sms' || o.type === 'email+sms',
  )
  @IsString()
  @Matches(/^[\dA-Za-z+]{1,15}$/, {
    message:
      'SMS sender must be alphanumeric (max 11 chars) or E.164 phone number (max 15 chars)',
  })
  smsSender?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default identity for its type(s)',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
