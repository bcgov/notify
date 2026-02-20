import { ApiProperty } from '@nestjs/swagger';
import { Identity } from './identity';

export class IdentitiesListResponse {
  @ApiProperty({
    description: 'List of identities',
    type: [Identity],
  })
  identities: Identity[];
}
