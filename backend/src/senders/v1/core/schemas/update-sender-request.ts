import { PartialType } from '@nestjs/swagger';
import { CreateSenderRequest } from './create-sender-request';

export class UpdateSenderRequest extends PartialType(CreateSenderRequest) {}
