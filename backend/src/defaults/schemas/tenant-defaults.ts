import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class TenantDefaults {
  @ApiPropertyOptional({
    description: 'Valid values from GET /adapters email list',
  })
  @IsOptional()
  @IsString()
  emailAdapter?: string;

  @ApiPropertyOptional({
    description: 'Valid values from GET /adapters sms list',
  })
  @IsOptional()
  @IsString()
  smsAdapter?: string;

  @ApiPropertyOptional({
    description: 'Valid values from GET /identities',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  emailIdentityId?: string;

  @ApiPropertyOptional({
    description: 'Valid values from GET /identities',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  smsIdentityId?: string;

  @ApiPropertyOptional({
    description: 'Valid values from GET /adapters renderers list',
  })
  @IsOptional()
  @IsString()
  renderer?: string;

  @ApiPropertyOptional({ enum: ['high', 'normal', 'low'] })
  @IsOptional()
  @IsIn(['high', 'normal', 'low'])
  priority?: string;

  @ApiPropertyOptional({ enum: ['utf-8', 'base64', 'binary', 'hex'] })
  @IsOptional()
  @IsIn(['utf-8', 'base64', 'binary', 'hex'])
  encoding?: string;

  @ApiPropertyOptional({ enum: ['html', 'text'] })
  @IsOptional()
  @IsIn(['html', 'text'])
  bodyType?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when defaults were last updated',
    format: 'date-time',
  })
  @IsOptional()
  @IsString()
  updatedAt?: string;
}
