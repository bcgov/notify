import { PartialType } from '@nestjs/swagger';
import { CreateTemplateRequest } from './create-template-request';

/**
 * Request schema for updating a template.
 * Extension: Management schema - not part of the official GC Notify API.
 */
export class UpdateTemplateRequest extends PartialType(CreateTemplateRequest) {}
