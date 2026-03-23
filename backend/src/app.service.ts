import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Minimal response for `GET /` / `HEAD /` — stable across API versions (gateway probes). */
  getServiceRoot() {
    return {
      status: 'ok',
      service: 'bc-notify-api',
      api: '/api/v1',
    };
  }

  getApiRoot() {
    return {
      service: 'bc-notify-api',
      apiVersion: 'v1',
      documentation: '/api/docs',
      health: '/api/v1/health',
      live: '/api/v1/health/live',
      ready: '/api/v1/health/ready',
    };
  }
}
