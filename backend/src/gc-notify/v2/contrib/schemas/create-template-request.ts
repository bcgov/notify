import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request schema for creating a template.
 * Extension: Management schema - not part of the official GC Notify API.
 */
export class CreateTemplateRequest {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Type of notification this template is for',
    enum: ['sms', 'email'],
  })
  @IsIn(['sms', 'email'])
  type: 'sms' | 'email';

  @ApiPropertyOptional({
    description: 'Subject template (for email)',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Message body template' })
  @IsString()
  body: string;

  @ApiPropertyOptional({
    description: 'Variables to substitute in the template',
  })
  @IsOptional()
  @IsObject()
  personalisation?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Whether the template is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description:
      'Template engine (handlebars, jinja2, etc.). Defaults to module default when absent.',
  })
  @IsOptional()
  @IsString()
  engine?: string;
}
