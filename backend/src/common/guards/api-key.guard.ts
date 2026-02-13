import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    // Support "ApiKey-v1 <key>" format (GC Notify style)
    const parts = authHeader.split(' ');
    const scheme = parts[0];
    const token = parts[1];

    if (scheme !== 'ApiKey-v1' || !token) {
      throw new UnauthorizedException(
        'Invalid authorization format. Expected: ApiKey-v1 <your-api-key>',
      );
    }

    const validApiKey = this.configService.get<string>('api.apiKey');

    if (!validApiKey || token !== validApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
