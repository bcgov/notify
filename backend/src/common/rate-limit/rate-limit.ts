import rateLimit, { type Options } from 'express-rate-limit';

const defaults: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
};

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  /** Higher ceiling for `GET`/`HEAD /` (gateway probes) in the same window as `max`. */
  serviceRootMax: number;
  apiWindowMs: number;
  apiMax: number;
  publicWindowMs: number;
  publicMax: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60_000,
  max: 100,
  serviceRootMax: 2000,
  apiWindowMs: 60_000,
  apiMax: 60,
  publicWindowMs: 60_000,
  publicMax: 200,
};

function isServiceRootProbe(req: { path: string; method: string }): boolean {
  return req.path === '/' && (req.method === 'GET' || req.method === 'HEAD');
}

export function createGlobalRateLimit(config: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...config };
  return rateLimit({
    ...defaults,
    windowMs: c.windowMs,
    max: (req) => (isServiceRootProbe(req) ? c.serviceRootMax : c.max),
  });
}

export function createApiRateLimit(config: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...config };
  return rateLimit({
    ...defaults,
    windowMs: c.apiWindowMs,
    max: c.apiMax,
  });
}

export function createPublicRateLimit(config: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...config };
  return rateLimit({
    ...defaults,
    windowMs: c.publicWindowMs,
    max: c.publicMax,
  });
}

export function createRateLimiters(config: Partial<RateLimitConfig> = {}) {
  const c = { ...defaultConfig, ...config };
  return {
    globalRateLimit: createGlobalRateLimit(c),
    apiRateLimit: createApiRateLimit(c),
    publicRateLimit: createPublicRateLimit(c),
  };
}
