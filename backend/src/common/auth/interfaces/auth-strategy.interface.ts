import type { Request } from 'express';
import type { AuthStrategyName, RequestPrincipal } from '../types';

export interface AuthStrategy {
  readonly name: AuthStrategyName;
  authenticate(request: Request): RequestPrincipal | null;
}
