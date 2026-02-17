import { PartialType } from '@nestjs/swagger';
import { CreateTemplateRequest } from './create-template-request';

export class UpdateTemplateRequest extends PartialType(CreateTemplateRequest) {}
