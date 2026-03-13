import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AuthStrategy } from './interfaces/auth-strategy.interface';
import { AUTH_STRATEGIES } from './tokens';
import type { AuthStrategyName, RequestPrincipal } from './types';

@Injectable()
export class PrincipalResolver {
  constructor(
    private readonly configService: ConfigService,
    @Inject(AUTH_STRATEGIES)
    private readonly authStrategies: AuthStrategy[],
  ) {}

  resolveOptional(request: Request): RequestPrincipal | null {
    for (const strategy of this.getEnabledStrategies()) {
      const principal = strategy.authenticate(request);
      if (principal) {
        return principal;
      }
    }

    return null;
  }

  private getEnabledStrategies(): AuthStrategy[] {
    const names = this.getConfiguredStrategies()
      .map((item) => item.trim())
      .filter((item): item is AuthStrategyName => Boolean(item));

    if (names.length === 0) {
      throw new InternalServerErrorException(
        'At least one auth strategy must be configured',
      );
    }

    const strategyMap = new Map(
      this.authStrategies.map((strategy) => [strategy.name, strategy]),
    );

    return names.map((name) => {
      const strategy = strategyMap.get(name);
      if (!strategy) {
        throw new InternalServerErrorException(
          `Unsupported auth strategy "${name}"`,
        );
      }
      return strategy;
    });
  }

  private getConfiguredStrategies(): string[] {
    const configured = this.configService.get<string | string[]>(
      'auth.strategies',
    );
    if (Array.isArray(configured)) {
      return configured;
    }
    if (typeof configured === 'string') {
      return configured.split(',');
    }
    return ['gateway-service-client', 'gc-notify-api-key'];
  }
}
