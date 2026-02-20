import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CommonFields } from './common-fields';
import { EmailFields } from './email-fields';

export class OverrideOrAugment {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => CommonFields)
  common?: CommonFields;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailFields)
  email?: EmailFields;
}
