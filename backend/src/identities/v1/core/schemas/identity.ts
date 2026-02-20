import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Identity {
  @ApiProperty({
    description: 'Unique identifier for the identity',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Identity type',
    enum: ['email', 'sms', 'email+sms'],
  })
  type: 'email' | 'sms' | 'email+sms';

  @ApiPropertyOptional({
    description: 'Email address for reply-to (when type is email or email+sms)',
    example: 'noreply@gov.bc.ca',
  })
  emailAddress?: string;

  @ApiPropertyOptional({
    description:
      'SMS sender - alphanumeric sender ID (e.g. GOVBC) or E.164 phone number',
    examples: {
      alphanumeric: { value: 'GOVBC' },
      e164: { value: '+15551234567' },
    },
  })
  smsSender?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when identity was created',
    format: 'date-time',
  })
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when identity was last updated',
    format: 'date-time',
  })
  updatedAt?: string;
}
