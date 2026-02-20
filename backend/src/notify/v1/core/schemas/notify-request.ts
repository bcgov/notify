import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OverrideOrAugment } from './override-or-augment';

export class NotifyRequest {
  @ApiProperty({
    description: 'Identifier for a stored defaults profile (notifyType code)',
    example: 'single-email',
  })
  @IsString()
  notifyType: string;

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
