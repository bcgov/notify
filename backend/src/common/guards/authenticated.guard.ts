import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/types';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.authResolutionError) {
      throw request.authResolutionError;
    }
    if (!request.principal) {
      throw new UnauthorizedException('Authentication is required');
    }

    return true;
  }
}
