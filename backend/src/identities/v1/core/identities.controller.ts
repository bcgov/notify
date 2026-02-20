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
import { IdentitiesService } from '../../identities.service';
import { ApiKeyGuard } from '../../../common/guards';
import {
  Identity,
  CreateIdentityRequest,
  UpdateIdentityRequest,
  IdentitiesListResponse,
} from './schemas';

@ApiTags('Identities')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('identities')
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List identities' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['email', 'sms', 'email+sms'],
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved identities',
    type: IdentitiesListResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getIdentities(@Query('type') type?: 'email' | 'sms' | 'email+sms') {
    return this.identitiesService.getIdentities(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get identity by ID' })
  @ApiResponse({
    status: 200,
    description: 'Identity retrieved successfully',
    type: Identity,
  })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  getIdentity(@Param('id') id: string) {
    return this.identitiesService.getIdentity(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create identity' })
  @ApiResponse({
    status: 201,
    description: 'Identity created successfully',
    type: Identity,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createIdentity(@Body() body: CreateIdentityRequest) {
    return this.identitiesService.createIdentity(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update identity' })
  @ApiResponse({
    status: 200,
    description: 'Identity updated successfully',
    type: Identity,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  updateIdentity(@Param('id') id: string, @Body() body: UpdateIdentityRequest) {
    return this.identitiesService.updateIdentity(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete identity' })
  @ApiResponse({ status: 204, description: 'Identity deleted successfully' })
  @ApiResponse({ status: 404, description: 'Identity not found' })
  deleteIdentity(@Param('id') id: string) {
    return this.identitiesService.deleteIdentity(id);
  }
}
