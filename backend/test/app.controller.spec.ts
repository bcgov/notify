import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController', () => {
  let appController: AppController;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = moduleRef.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  it('getApiRoot returns service metadata and health paths', () => {
    expect(appController.getApiRoot()).toEqual({
      service: 'bc-notify-api',
      apiVersion: 'v1',
      documentation: '/api/docs',
      health: '/api/v1/health',
      live: '/api/v1/health/live',
      ready: '/api/v1/health/ready',
    });
  });

  it('getServiceRoot (via AppService) is gateway-stable', () => {
    const appService = moduleRef.get(AppService);
    expect(appService.getServiceRoot()).toEqual({
      status: 'ok',
      service: 'bc-notify-api',
      api: '/api/v1',
    });
  });
});
