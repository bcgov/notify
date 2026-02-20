import { PartialType } from '@nestjs/swagger';
import { CreateNotifyTypeRequest } from './create-notify-type-request';

export class UpdateNotifyTypeRequest extends PartialType(
  CreateNotifyTypeRequest,
) {}
