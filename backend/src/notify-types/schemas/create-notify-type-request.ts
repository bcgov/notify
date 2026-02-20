import { IsString, IsOptional, IsIn, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotifyTypeRequest {
  @ApiProperty({
    description: 'Identifier used in notifyType',
    example: 'single-email',
  })
  @IsString()
  code: string;

  @ApiPropertyOptional({ enum: ['email', 'sms', 'both'] })
  @IsOptional()
  @IsIn(['email', 'sms', 'both'])
  sendAs?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  renderer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  params?: Record<string, string>;
}
