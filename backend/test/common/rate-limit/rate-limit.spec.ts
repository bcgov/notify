import express from 'express';
import request from 'supertest';
import {
  createApiRateLimit,
  createGlobalRateLimit,
} from '../../../src/common/rate-limit/rate-limit';

const rateLimitErrorBody = {
  error: 'Too many requests, please try again later',
};

function appWithGlobalMax(max: number) {
  const app = express();
  app.use(createGlobalRateLimit({ max, windowMs: 60_000 }));
  app.get('/ping', (_req, res) => res.sendStatus(200));
  return app;
}

function appWithApiMax(apiMax: number) {
  const app = express();
  app.use(createApiRateLimit({ apiMax, apiWindowMs: 60_000 }));
  app.post('/api/x', (_req, res) => res.sendStatus(201));
  return app;
}

test('global rate limit: third GET returns 429 and JSON error body', async () => {
  const agent = request(appWithGlobalMax(2));
  await agent.get('/ping').expect(200);
  await agent.get('/ping').expect(200);
  const res = await agent.get('/ping').expect(429);
  expect(res.body).toEqual(rateLimitErrorBody);
});

test('API rate limit: second POST returns 429 and JSON error body', async () => {
  const agent = request(appWithApiMax(1));
  await agent.post('/api/x').expect(201);
  const res = await agent.post('/api/x').expect(429);
  expect(res.body).toEqual(rateLimitErrorBody);
});
