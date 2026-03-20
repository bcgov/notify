import type { IncomingMessage, ServerResponse } from 'http';
import pinoHttp from 'pino-http';
import rTracer from 'cls-rtracer';
import { v7 as uuidv7 } from 'uuid';
import { log } from './logger';

function normalizeRequestId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (typeof value === 'symbol') return String(value);
  return undefined;
}

export const httpLogger = pinoHttp({
  logger: log,
  autoLogging: true,
  customLogLevel(_req, res, err) {
    if (err != null || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  genReqId(req, res): string {
    const normalizedClsRequestId = normalizeRequestId(rTracer.id());
    const headerRequestId = req.headers['x-request-id'];
    const existingHeaderId = Array.isArray(headerRequestId)
      ? headerRequestId[0]
      : headerRequestId;
    const existingReqId = typeof req.id === 'string' ? req.id : undefined;
    const requestId: string =
      normalizedClsRequestId ?? existingReqId ?? existingHeaderId ?? uuidv7();

    req.id = requestId;
    if (res.getHeader('X-Request-Id') == null) {
      res.setHeader('X-Request-Id', requestId);
    }

    return requestId;
  },
  customProps(req) {
    return {
      requestId:
        normalizeRequestId(rTracer.id()) ??
        (typeof req.id === 'string' ? req.id : undefined),
    };
  },
  serializers: {
    req(req: IncomingMessage) {
      const r = req as IncomingMessage & { id?: string; url?: string };
      return {
        id: r.id,
        method: r.method,
        url: r.url,
        remoteAddress: r.socket?.remoteAddress,
        headers: r.headers,
      };
    },
    res(res: ServerResponse) {
      return {
        statusCode: res.statusCode,
        headers:
          typeof res.getHeaders === 'function' ? res.getHeaders() : undefined,
      };
    },
    err(err: Error) {
      return {
        type: err.name,
        message: err.message,
        stack: err.stack,
      };
    },
  },
});
