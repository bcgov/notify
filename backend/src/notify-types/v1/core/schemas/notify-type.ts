import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotifyType {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Identifier used in notifyType',
    example: 'single-email',
  })
  code: string;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'both'] })
  sendAs?: string;

  @ApiPropertyOptional({ description: 'Template ID', format: 'uuid' })
  templateId?: string;

  @ApiPropertyOptional({ description: 'Identity ID', format: 'uuid' })
  identityId?: string;

  @ApiPropertyOptional({
    description:
      'Template renderer ID. Valid values from GET /adapters renderers list',
  })
  renderer?: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiPropertyOptional()
  body?: string;

  @ApiPropertyOptional({ description: 'Default template params' })
  params?: Record<string, string>;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}
