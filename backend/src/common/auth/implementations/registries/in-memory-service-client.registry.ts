import { Injectable } from '@nestjs/common';
import type { ServiceClientRegistry } from '../../interfaces/service-client.registry';
import type { ServiceClientRecord } from '../../types';
import { WorkspaceAuthBootstrapService } from '../bootstrap/workspace-auth-bootstrap.service';

@Injectable()
export class InMemoryServiceClientRegistry implements ServiceClientRegistry {
  private readonly serviceClients: Map<string, ServiceClientRecord>;

  constructor(bootstrapService: WorkspaceAuthBootstrapService) {
    this.serviceClients = new Map(
      bootstrapService
        .getServiceClients()
        .map((serviceClient) => [serviceClient.gatewayClientId, serviceClient]),
    );
  }

  findByGatewayClientId(
    gatewayClientId: string,
  ): ServiceClientRecord | undefined {
    return this.serviceClients.get(gatewayClientId);
  }
}
