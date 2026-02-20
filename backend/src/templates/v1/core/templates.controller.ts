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
import { TemplatesService } from '../../templates.service';
import { ApiKeyGuard } from '../../../common/guards';
import {
  Template,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplatesListResponse,
} from './schemas';

@ApiTags('Templates')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List templates' })
  @ApiQuery({ name: 'type', required: false, enum: ['sms', 'email'] })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved templates',
    type: TemplatesListResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getTemplates(@Query('type') type?: 'sms' | 'email') {
    return this.templatesService.getTemplates(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: Template,
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  getTemplate(@Param('id') id: string) {
    return this.templatesService.getTemplate(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: Template,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createTemplate(@Body() body: CreateTemplateRequest) {
    return this.templatesService.createTemplate(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: Template,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  updateTemplate(@Param('id') id: string, @Body() body: UpdateTemplateRequest) {
    return this.templatesService.updateTemplate(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  deleteTemplate(@Param('id') id: string) {
    return this.templatesService.deleteTemplate(id);
  }
}
