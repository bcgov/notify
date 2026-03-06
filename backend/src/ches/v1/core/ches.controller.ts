import {
  Controller,
  Post,
  Get,
  Delete,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { NotImplementedException } from '@nestjs/common';
import { ApiKeyGuard } from '../../../common/guards';
import { ChesApiClient } from '../../ches-api.client';
import { ChesMessageObject } from './schemas/ches-message-object';
import { ChesTransactionResponse } from './schemas/ches-transaction-response';

@ApiTags('CHES')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('ches')
export class ChesController {
  constructor(private readonly chesApiClient: ChesApiClient) {}

  @Post('email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send an email' })
  @ApiBody({ type: ChesMessageObject, description: 'Email message details' })
  @ApiResponse({
    status: 201,
    description: 'Email message queued successfully',
    type: ChesTransactionResponse,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable entity - validation error',
  })
  async postEmail(
    @Body() body: ChesMessageObject,
  ): Promise<ChesTransactionResponse> {
    return this.chesApiClient.sendEmail(body);
  }

  @Post('emailMerge')
  @ApiOperation({ summary: 'Template mail merge and email sending (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  postMerge(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES email merge - POST /ches/emailMerge',
    );
  }

  @Post('emailMerge/preview')
  @ApiOperation({
    summary: 'Template mail merge validation and preview (TODO)',
  })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  postPreview(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES email merge preview - POST /ches/emailMerge/preview',
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Query CHES message status (TODO)' })
  @ApiQuery({ name: 'msgId', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['accepted', 'cancelled', 'completed', 'failed', 'pending'],
  })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'txId', required: false })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  getStatusQuery(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES status query - GET /ches/status',
    );
  }

  @Get('status/:msgId')
  @ApiOperation({ summary: 'Get CHES message status (TODO)' })
  @ApiParam({ name: 'msgId' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  getStatusMessage(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES message status - GET /ches/status/:msgId',
    );
  }

  @Post('promote')
  @ApiOperation({ summary: 'Promote CHES messages (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  postPromoteQuery(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES promote - POST /ches/promote',
    );
  }

  @Post('promote/:msgId')
  @ApiOperation({ summary: 'Promote a single CHES message (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  postPromoteMessage(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES promote message - POST /ches/promote/:msgId',
    );
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel CHES messages (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  deleteCancelQuery(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES cancel - DELETE /ches/cancel',
    );
  }

  @Delete('cancel/:msgId')
  @ApiOperation({ summary: 'Cancel a single CHES message (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  deleteCancelMessage(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES cancel message - DELETE /ches/cancel/:msgId',
    );
  }

  @Get('health')
  @ApiOperation({ summary: 'CHES health' })
  @ApiResponse({ status: 200, description: 'CHES health status' })
  getHealth() {
    return { dependencies: [] };
  }
}
