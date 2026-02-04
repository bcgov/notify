import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Unique notification ID',
    example: '740e5834-3a29-46b4-9a6f-16142fde533a',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'Client reference if provided',
    example: 'my-reference-123',
  })
  reference?: string;

  @ApiProperty({
    description: 'Notification content details',
  })
  content: {
    body: string;
    subject?: string;
    from_email?: string;
    from_number?: string;
  };

  @ApiProperty({
    description: 'URI to fetch notification status',
    example: '/v2/notifications/740e5834-3a29-46b4-9a6f-16142fde533a',
  })
  uri: string;

  @ApiProperty({
    description: 'Template information',
  })
  template: {
    id: string;
    version: number;
    uri: string;
  };
}
