import configuration from '../../src/config/configuration';

const envSnapshot = { ...process.env };

afterEach(() => {
  process.env = { ...envSnapshot };
});

test('configuration: default rate limits and debug log level when env omits those vars', () => {
  delete process.env.RATE_LIMIT_WINDOW_MS;
  delete process.env.RATE_LIMIT_MAX;
  delete process.env.RATE_LIMIT_SERVICE_ROOT_MAX;
  delete process.env.RATE_LIMIT_API_WINDOW_MS;
  delete process.env.RATE_LIMIT_API_MAX;
  delete process.env.RATE_LIMIT_PUBLIC_WINDOW_MS;
  delete process.env.RATE_LIMIT_PUBLIC_MAX;
  delete process.env.LOG_LEVEL;
  process.env.NODE_ENV = 'development';

  const config = configuration();

  expect(config.rateLimit).toEqual({
    windowMs: 60_000,
    max: 100,
    serviceRootMax: 2000,
    apiWindowMs: 60_000,
    apiMax: 60,
    publicWindowMs: 60_000,
    publicMax: 200,
  });
  expect(config.log.level).toBe('debug');
});

test('configuration: info log level in production when LOG_LEVEL is omitted', () => {
  delete process.env.LOG_LEVEL;
  process.env.NODE_ENV = 'production';

  expect(configuration().log.level).toBe('info');
});

test('configuration: log level matches LOG_LEVEL when set', () => {
  process.env.LOG_LEVEL = 'warn';
  process.env.NODE_ENV = 'development';

  expect(configuration().log.level).toBe('warn');
});

test('configuration: trustProxy is undefined when TRUST_PROXY is unset or disabled', () => {
  delete process.env.TRUST_PROXY;
  expect(configuration().trustProxy).toBeUndefined();

  process.env.TRUST_PROXY = 'false';
  expect(configuration().trustProxy).toBeUndefined();

  process.env.TRUST_PROXY = '0';
  expect(configuration().trustProxy).toBeUndefined();
});

test('configuration: trustProxy is 1 when TRUST_PROXY enables trust (typical single gateway hop)', () => {
  process.env.TRUST_PROXY = '1';
  expect(configuration().trustProxy).toBe(1);

  process.env.TRUST_PROXY = 'true';
  expect(configuration().trustProxy).toBe(1);

  process.env.TRUST_PROXY = 'yes';
  expect(configuration().trustProxy).toBe(1);
});

test('configuration: trustProxy parses multi-hop proxy count', () => {
  process.env.TRUST_PROXY = '2';
  expect(configuration().trustProxy).toBe(2);
});

test('configuration: rate limit fields match parsed env values', () => {
  process.env.RATE_LIMIT_WINDOW_MS = '120000';
  process.env.RATE_LIMIT_MAX = '10';
  process.env.RATE_LIMIT_SERVICE_ROOT_MAX = '5000';
  process.env.RATE_LIMIT_API_WINDOW_MS = '30000';
  process.env.RATE_LIMIT_API_MAX = '5';
  process.env.RATE_LIMIT_PUBLIC_WINDOW_MS = '90000';
  process.env.RATE_LIMIT_PUBLIC_MAX = '500';

  expect(configuration().rateLimit).toEqual({
    windowMs: 120_000,
    max: 10,
    serviceRootMax: 5000,
    apiWindowMs: 30_000,
    apiMax: 5,
    publicWindowMs: 90_000,
    publicMax: 500,
  });
});
