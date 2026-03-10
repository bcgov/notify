import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { AuthenticatedGuard } from '../common/guards';
import { DeliveryContextService } from '../common/delivery-context/delivery-context.service';

@ApiTags('Context')
@ApiSecurity('api-key')
@UseGuards(AuthenticatedGuard)
@Controller('me')
export class MeController {
  private readonly logger = new Logger(MeController.name);

  constructor(private readonly deliveryContext: DeliveryContextService) {}

  @Get()
  @ApiOperation({ summary: 'Current request principal (workspace, client)' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated principal and workspace',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(): {
    workspaceId: string;
    gatewayClientId?: string;
    authSource: string;
  } {
    const principal = this.deliveryContext.getPrincipal();
    this.logger.log(
      `GET /me → workspaceId=${principal.workspaceId} gatewayClientId=${principal.gatewayClientId ?? '-'} authSource=${principal.authSource}`,
    );
    return {
      workspaceId: principal.workspaceId,
      gatewayClientId: principal.gatewayClientId,
      authSource: principal.authSource,
    };
  }
}
