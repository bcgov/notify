import pino from 'pino';
import rTracer from 'cls-rtracer';

/**
 * Correlation ID (request id) from CLS. Use this when building log payloads
 * or integrating with systems that need the id (e.g. DB query loggers).
 * Returns undefined when not inside a request (e.g. worker, startup).
 */
export function getCorrelationId(): string | undefined {
  const id = rTracer.id();
  if (id == null) return undefined;
  if (typeof id === 'string') return id;
  if (
    typeof id === 'number' ||
    typeof id === 'symbol' ||
    typeof id === 'boolean'
  ) {
    return String(id);
  }
  return undefined;
}

const isDev = process.env.NODE_ENV !== 'production';

const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  mixin() {
    const requestId = getCorrelationId();
    return requestId != null ? { requestId } : {};
  },
};

if (isDev) {
  Object.assign(pinoOptions, {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: true,
        messageFormat:
          '{req.method} {req.url} {res.statusCode} {responseTime}ms rid={requestId}',
      },
    },
  });
}

const rootLogger = pino(pinoOptions);

/**
 * Application logger. Every log entry automatically includes the current
 * request's correlation id (when running inside a request context from cls-rtracer).
 * Use log.info(), log.error(), log.warn(), log.debug() as usual.
 */
export const log = rootLogger;

export default log;
