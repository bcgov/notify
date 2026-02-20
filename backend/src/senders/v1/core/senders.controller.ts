import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { SendersService } from '../../senders.service';
import { ApiKeyGuard } from '../../../common/guards';
import {
  Sender,
  CreateSenderRequest,
  UpdateSenderRequest,
  SendersListResponse,
} from './schemas';

@ApiTags('Senders')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('v1/senders')
export class SendersController {
  constructor(private readonly sendersService: SendersService) {}

  @Get()
  @ApiOperation({ summary: 'List senders' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['email', 'sms', 'email+sms'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved senders',
    type: SendersListResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getSenders(@Query('type') type?: 'email' | 'sms' | 'email+sms') {
    return this.sendersService.getSenders(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sender by ID' })
  @ApiResponse({
    status: 200,
    description: 'Sender retrieved successfully',
    type: Sender,
  })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  getSender(@Param('id') id: string) {
    return this.sendersService.getSender(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create sender' })
  @ApiResponse({
    status: 201,
    description: 'Sender created successfully',
    type: Sender,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createSender(@Body() body: CreateSenderRequest) {
    return this.sendersService.createSender(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update sender' })
  @ApiResponse({
    status: 200,
    description: 'Sender updated successfully',
    type: Sender,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  updateSender(@Param('id') id: string, @Body() body: UpdateSenderRequest) {
    return this.sendersService.updateSender(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sender' })
  @ApiResponse({ status: 204, description: 'Sender deleted successfully' })
  @ApiResponse({ status: 404, description: 'Sender not found' })
  deleteSender(@Param('id') id: string) {
    return this.sendersService.deleteSender(id);
  }
}
