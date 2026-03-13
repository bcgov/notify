import type { ServiceClientRecord } from '../types';

export interface ServiceClientRegistry {
  findByGatewayClientId(
    gatewayClientId: string,
  ): ServiceClientRecord | undefined;
}
