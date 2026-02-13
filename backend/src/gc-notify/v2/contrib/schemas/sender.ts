import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Sender entity for email reply-to and SMS sender configuration.
 * Extension: Management schema - not part of the official GC Notify API.
 */
export class Sender {
  @ApiProperty({
    description: 'Unique identifier for the sender',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Sender type',
    enum: ['email', 'sms', 'email+sms'],
  })
  type: 'email' | 'sms' | 'email+sms';

  @ApiPropertyOptional({
    description:
      'Email address for reply-to (required when type is email or email+sms)',
    example: 'noreply@gov.bc.ca',
  })
  email_address?: string;

  @ApiPropertyOptional({
    description:
      'SMS sender - either alphanumeric sender ID (e.g. GOVBC) or E.164 phone number (e.g. +15551234567)',
    examples: {
      alphanumeric: { value: 'GOVBC' },
      e164: { value: '+15551234567' },
    },
  })
  sms_sender?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default sender for its type(s)',
  })
  is_default?: boolean;

  @ApiProperty({
    description: 'Timestamp when sender was created',
    format: 'date-time',
  })
  created_at: string;

  @ApiPropertyOptional({
    description: 'Timestamp when sender was last updated',
    format: 'date-time',
  })
  updated_at?: string;
}
