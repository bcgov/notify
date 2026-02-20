import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiHeader,
} from '@nestjs/swagger';
import { NotImplementedException } from '@nestjs/common';
import { NotifyService } from '../../notify.service';
import { NotifyRequest, NotifyResponse } from './schemas';
import { ApiKeyGuard } from '../../../common/guards';

@ApiTags('Notify')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('notify')
export class NotifyController {
  constructor(private readonly notifyService: NotifyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a notification using stored defaults for notifyType',
  })
  @ApiHeader({
    name: 'X-Delivery-Email-Adapter',
    required: false,
    description: 'Email adapter: nodemailer or ches. Defaults to config.',
  })
  @ApiResponse({
    status: 201,
    description: 'Notification accepted',
    type: NotifyResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async send(@Body() body: NotifyRequest): Promise<NotifyResponse> {
    return this.notifyService.send(body);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview resolved gateway payloads (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  preview(): never {
    throw new NotImplementedException(
      'TODO: Implement notify preview - returns fully resolved gateway payloads',
    );
  }

  @Get('status/:notifyId')
  @ApiOperation({ summary: 'Get status for a notify transaction (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  getStatus(): never {
    throw new NotImplementedException(
      'TODO: Implement notify status - fetch transaction status by notifyId',
    );
  }

  @Delete('cancel/:notifyId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Cancel a notify transaction (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  cancel(): never {
    throw new NotImplementedException(
      'TODO: Implement notify cancel - cancel transaction by notifyId',
    );
  }

  @Post('registerCallback')
  @ApiOperation({ summary: 'Register a callback endpoint (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  registerCallback(): never {
    throw new NotImplementedException(
      'TODO: Implement notify registerCallback - register callback for status updates',
    );
  }
}
