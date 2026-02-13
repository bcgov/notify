import { ApiProperty } from '@nestjs/swagger';
import { Sender } from './sender';

export class SendersListResponse {
  @ApiProperty({
    description: 'List of senders',
    type: [Sender],
  })
  senders: Sender[];
}
