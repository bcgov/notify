import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
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
} from '@nestjs/swagger';
import { NotifyTypesService } from '../../notify-types.service';
import { ApiKeyGuard } from '../../../common/guards';
import {
  NotifyType,
  CreateNotifyTypeRequest,
  UpdateNotifyTypeRequest,
} from '../../schemas';

@ApiTags('NotifyTypes')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('notifyTypes')
export class NotifyTypesController {
  constructor(private readonly notifyTypesService: NotifyTypesService) {}

  @Get()
  @ApiOperation({ summary: 'List notify types' })
  @ApiResponse({
    status: 200,
    description: 'Notify type list',
    schema: {
      type: 'object',
      properties: {
        notifyTypes: {
          type: 'array',
          items: { $ref: '#/components/schemas/NotifyType' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getNotifyTypes() {
    return this.notifyTypesService.getNotifyTypes();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notify type by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notify type details',
    type: NotifyType,
  })
  @ApiResponse({ status: 404, description: 'Notify type not found' })
  getNotifyType(@Param('id') id: string) {
    return this.notifyTypesService.getNotifyType(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create notify type' })
  @ApiResponse({
    status: 201,
    description: 'Notify type created',
    type: NotifyType,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Conflict - code already exists' })
  createNotifyType(@Body() body: CreateNotifyTypeRequest) {
    return this.notifyTypesService.createNotifyType(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update notify type' })
  @ApiResponse({
    status: 200,
    description: 'Notify type updated',
    type: NotifyType,
  })
  @ApiResponse({ status: 404, description: 'Notify type not found' })
  updateNotifyType(
    @Param('id') id: string,
    @Body() body: UpdateNotifyTypeRequest,
  ) {
    return this.notifyTypesService.updateNotifyType(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete notify type' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Notify type not found' })
  deleteNotifyType(@Param('id') id: string) {
    return this.notifyTypesService.deleteNotifyType(id);
  }
}
