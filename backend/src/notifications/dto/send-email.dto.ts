import { IsEmail, IsString, IsOptional, IsObject, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipient email address',
    example: 'recipient@gov.bc.ca',
  })
  @IsEmail()
  to: string;

  @ApiProperty({
    description: 'Template ID to use for the email',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  template_id: string;

  @ApiPropertyOptional({
    description: 'Personalization variables for the template',
    example: { name: 'John Doe', reference_number: 'REF-12345' },
  })
  @IsOptional()
  @IsObject()
  personalisation?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Client reference for tracking',
    example: 'my-reference-123',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}