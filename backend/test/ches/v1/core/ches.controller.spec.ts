import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotImplementedException } from '@nestjs/common';
import { ChesController } from '../../../../src/ches/v1/core/ches.controller';
import { ChesApiClient } from '../../../../src/ches/ches-api.client';

const notImplemented = () => {
  throw new NotImplementedException();
};

describe('ChesController', () => {
  let controller: ChesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChesController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'api.apiKey' ? 'test-key' : undefined,
            ),
          },
        },
        {
          provide: ChesApiClient,
          useValue: {
            sendEmail: jest.fn(notImplemented),
            sendEmailMerge: jest.fn(notImplemented),
            previewEmailMerge: jest.fn(notImplemented),
            getStatusQuery: jest.fn(notImplemented),
            getStatusMessage: jest.fn(notImplemented),
            promoteQuery: jest.fn(notImplemented),
            promoteMessage: jest.fn(notImplemented),
            cancelQuery: jest.fn(notImplemented),
            cancelMessage: jest.fn(notImplemented),
          },
        },
      ],
    }).compile();

    controller = module.get(ChesController);
  });

  it('postEmail throws NotImplementedException', async () => {
    await expect(
      controller.postEmail({} as Parameters<ChesController['postEmail']>[0]),
    ).rejects.toThrow(NotImplementedException);
  });

  it('postMerge throws NotImplementedException', async () => {
    await expect(
      controller.postMerge({} as Parameters<ChesController['postMerge']>[0]),
    ).rejects.toThrow(NotImplementedException);
  });

  it('postPreview throws NotImplementedException', async () => {
    await expect(
      controller.postPreview(
        {} as Parameters<ChesController['postPreview']>[0],
      ),
    ).rejects.toThrow(NotImplementedException);
  });

  it('getStatusQuery throws NotImplementedException', async () => {
    await expect(
      controller.getStatusQuery(
        {} as Parameters<ChesController['getStatusQuery']>[0],
      ),
    ).rejects.toThrow(NotImplementedException);
  });

  it('getStatusMessage throws NotImplementedException', async () => {
    await expect(
      controller.getStatusMessage('msg-id'),
    ).rejects.toThrow(NotImplementedException);
  });

  it('postPromoteQuery throws NotImplementedException', async () => {
    await expect(
      controller.postPromoteQuery(
        {} as Parameters<ChesController['postPromoteQuery']>[0],
      ),
    ).rejects.toThrow(NotImplementedException);
  });

  it('postPromoteMessage throws NotImplementedException', async () => {
    await expect(
      controller.postPromoteMessage('msg-id'),
    ).rejects.toThrow(NotImplementedException);
  });

  it('deleteCancelQuery throws NotImplementedException', async () => {
    await expect(
      controller.deleteCancelQuery(
        {} as Parameters<ChesController['deleteCancelQuery']>[0],
      ),
    ).rejects.toThrow(NotImplementedException);
  });

  it('deleteCancelMessage throws NotImplementedException', async () => {
    await expect(
      controller.deleteCancelMessage('msg-id'),
    ).rejects.toThrow(NotImplementedException);
  });

  it('getHealth returns dependencies array', () => {
    const result = controller.getHealth();
    expect(result).toEqual({ dependencies: [] });
  });
});
