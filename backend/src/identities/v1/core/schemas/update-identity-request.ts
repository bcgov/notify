import { PartialType } from '@nestjs/swagger';
import { CreateIdentityRequest } from './create-identity-request';

export class UpdateIdentityRequest extends PartialType(CreateIdentityRequest) {}
