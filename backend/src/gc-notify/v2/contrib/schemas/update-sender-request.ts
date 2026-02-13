import { PartialType } from '@nestjs/swagger';
import { CreateSenderRequest } from './create-sender-request';

/**
 * Request schema for updating a sender.
 * Extension: Management schema - not part of the official GC Notify API.
 */
export class UpdateSenderRequest extends PartialType(CreateSenderRequest) {}
