import { LoggerService } from '@nestjs/common';
import { log } from './logger';

/**
 * Nest LoggerService that delegates to the shared Pino logger.
 * Use app.useLogger(PinoLoggerService) in bootstrap so Nest uses Pino.
 */
export class PinoLoggerService implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.info(this.toPayload(message, context), String(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.error(this.toPayload(message, context), String(message));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.warn(this.toPayload(message, context), String(message));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.debug(this.toPayload(message, context), String(message));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.trace(this.toPayload(message, context), String(message));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    const context = this.getContext(optionalParams);
    log.fatal(this.toPayload(message, context), String(message));
  }

  private getContext(optionalParams: unknown[]): string | undefined {
    const last = optionalParams[optionalParams.length - 1];
    return typeof last === 'string' ? last : undefined;
  }

  private toPayload(
    message: unknown,
    context?: string,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (context) payload.context = context;
    if (
      typeof message === 'object' &&
      message !== null &&
      !Array.isArray(message)
    ) {
      Object.assign(payload, message);
    }
    return payload;
  }
}
