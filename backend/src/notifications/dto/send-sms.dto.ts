import {
  IsString,
  IsOptional,
  IsObject,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendSmsDto {
  @ApiProperty({
    description: 'Recipient phone number in E.164 format',
    example: '+12505551234',
  })
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format (e.g., +12505551234)',
  })
  phone_number: string;

  @ApiProperty({
    description: 'Template ID to use for the SMS',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  template_id: string;

  @ApiPropertyOptional({
    description: 'Personalization variables for the template',
    example: { code: '123456' },
  })
  @IsOptional()
  @IsObject()
  personalisation?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Client reference for tracking',
    example: 'my-sms-reference-456',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}
