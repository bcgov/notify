import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAssociation {
  @ApiProperty({ format: 'uuid' })
  msgId: string;

  @ApiProperty({ enum: ['email', 'sms'] })
  channel: 'email' | 'sms';

  @ApiProperty({ type: [String] })
  to: string[];
}

export class NotifyResponse {
  @ApiProperty({ description: 'Notify transaction ID', format: 'uuid' })
  notifyId: string;

  @ApiProperty({ description: 'Transaction ID', format: 'uuid' })
  txId: string;

  @ApiPropertyOptional({
    type: [MessageAssociation],
    description: 'Message associations',
  })
  messages?: MessageAssociation[];
}
