import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsObject, IsIn } from 'class-validator';

export class CommonFields {
  @ApiPropertyOptional({
    description: 'Recipients for single/broadcast',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @ApiPropertyOptional({
    description: 'Template ID (GET /templates)',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ enum: ['html', 'text'] })
  @IsOptional()
  @IsIn(['html', 'text'])
  bodyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renderer?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsOptional()
  @IsObject()
  params?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackId?: string;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'both'] })
  @IsOptional()
  @IsIn(['email', 'sms', 'both'])
  sendAs?: string;
}
