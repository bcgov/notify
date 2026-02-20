import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChesAttachmentObject {
  @ApiPropertyOptional() content?: string;
  @ApiPropertyOptional() contentType?: string;
  @ApiPropertyOptional({ enum: ['base64', 'binary', 'hex'] }) encoding?: string;
  @ApiPropertyOptional() filename?: string;
}

export class ChesMessageObject {
  @ApiProperty() bodyType: string;
  @ApiProperty() body: string;
  @ApiProperty() from: string;
  @ApiProperty({ type: [String] }) to: string[];
  @ApiProperty() subject: string;
  @ApiPropertyOptional({ type: [ChesAttachmentObject] })
  attachments?: ChesAttachmentObject[];
  @ApiPropertyOptional({ type: [String] }) bcc?: string[];
  @ApiPropertyOptional({ type: [String] }) cc?: string[];
  @ApiPropertyOptional() delayTS?: number;
  @ApiPropertyOptional({ enum: ['base64', 'binary', 'hex', 'utf-8'] })
  encoding?: string;
  @ApiPropertyOptional({ enum: ['normal', 'low', 'high'] }) priority?: string;
  @ApiPropertyOptional() tag?: string;
}
