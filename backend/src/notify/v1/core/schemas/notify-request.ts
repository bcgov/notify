import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OverrideOrAugment } from './override-or-augment';

export class NotifyRequest {
  @ApiPropertyOptional({
    description:
      'Required for template mode (stored notify type). Omit when using inline email (NOTIFY_INLINE_EMAIL_ENABLED + subject, body, renderer in override.common).',
    example: 'single-email',
  })
  @IsOptional()
  @IsString()
  notifyType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OverrideOrAugment)
  override?: OverrideOrAugment;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OverrideOrAugment)
  augment?: OverrideOrAugment;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  callbackId?: string;
}
