import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns gateway-stable service root', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(
        (res: {
          body: { status?: string; service?: string; api?: string };
        }) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.service).toBe('bc-notify-api');
          expect(res.body.api).toBe('/api/v1');
        },
      );
  });

  it('/ (HEAD) returns 200 (no response body)', async () => {
    const res = await request(app.getHttpServer()).head('/').expect(200);
    expect(res.body).toEqual({});
  });

  it('/api/v1 (GET) returns API base metadata', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect(
        (res: {
          body: {
            service?: string;
            apiVersion?: string;
            documentation?: string;
            health?: string;
            live?: string;
            ready?: string;
          };
        }) => {
          expect(res.body.service).toBe('bc-notify-api');
          expect(res.body.apiVersion).toBe('v1');
          expect(res.body.documentation).toBe('/api/docs');
          expect(res.body.health).toBe('/api/v1/health');
          expect(res.body.live).toBe('/api/v1/health/live');
          expect(res.body.ready).toBe('/api/v1/health/ready');
        },
      );
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res: { body: { status?: string; service?: string } }) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('bc-notify-api');
      });
  });
});
