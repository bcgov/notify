import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PartialType } from '@nestjs/swagger';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { DefaultsService } from '../../defaults.service';
import { ApiKeyGuard } from '../../../common/guards';
import { TenantDefaults } from './schemas/tenant-defaults';

class UpdateTenantDefaultsDto extends PartialType(TenantDefaults) {}

@ApiTags('Defaults')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('defaults')
export class DefaultsController {
  constructor(private readonly defaultsService: DefaultsService) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant defaults' })
  @ApiResponse({
    status: 200,
    description: 'Tenant defaults',
    type: TenantDefaults,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getDefaults(): TenantDefaults {
    return this.defaultsService.getDefaults();
  }

  @Put()
  @ApiOperation({ summary: 'Update tenant defaults' })
  @ApiResponse({
    status: 200,
    description: 'Defaults updated',
    type: TenantDefaults,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateDefaults(@Body() body: UpdateTenantDefaultsDto): TenantDefaults {
    return this.defaultsService.updateDefaults(body);
  }
}
