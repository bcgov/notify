import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class EmailFields {
  @ApiPropertyOptional({
    description: 'Identity ID (GET /identities)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  emailIdentityId?: string;
}
