import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('API')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API base — service identity and probe paths' })
  @ApiResponse({ status: 200, description: 'API metadata' })
  getApiRoot() {
    return this.appService.getApiRoot();
  }
}
