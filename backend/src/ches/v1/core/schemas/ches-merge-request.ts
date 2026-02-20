import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChesAttachmentObject } from './ches-message-object';

export class ChesContextObject {
  @ApiProperty() context: Record<string, unknown>;
  @ApiProperty({ type: [String] }) to: string[];
  @ApiPropertyOptional({ type: [String] }) bcc?: string[];
  @ApiPropertyOptional({ type: [String] }) cc?: string[];
  @ApiPropertyOptional() delayTS?: number;
  @ApiPropertyOptional() tag?: string;
}

export class ChesMergeRequest {
  @ApiProperty({ enum: ['html', 'text'] }) bodyType: string;
  @ApiProperty() body: string;
  @ApiProperty({ type: [ChesContextObject] }) contexts: ChesContextObject[];
  @ApiProperty() from: string;
  @ApiProperty() subject: string;
  @ApiPropertyOptional({ type: [ChesAttachmentObject] })
  attachments?: ChesAttachmentObject[];
  @ApiPropertyOptional({ enum: ['base64', 'binary', 'hex', 'utf-8'] })
  encoding?: string;
  @ApiPropertyOptional({ enum: ['normal', 'low', 'high'] }) priority?: string;
}
