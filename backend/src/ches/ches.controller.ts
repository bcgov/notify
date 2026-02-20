import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { NotImplementedException } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards';

@ApiTags('CHES')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('ches')
export class ChesController {
  @Post('email')
  @ApiOperation({ summary: 'Send an email (TODO)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  postEmail(): never {
    throw new NotImplementedException(
      'TODO: Implement CHES email send - POST /ches/email',
    );
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
