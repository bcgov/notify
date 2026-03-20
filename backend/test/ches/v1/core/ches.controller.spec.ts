import { Test, TestingModule } from '@nestjs/testing';
import { NotImplementedException } from '@nestjs/common';
import { ChesController } from '../../../../src/ches/v1/core/ches.controller';
import { ChesApiClient } from '../../../../src/ches/ches-api.client';

describe('ChesController', () => {
  let controller: ChesController;
  const notImplemented = new NotImplementedException();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChesController],
      providers: [
        {
          provide: ChesApiClient,
          useValue: {
            sendEmail: jest.fn().mockRejectedValue(notImplemented),
            sendEmailMerge: jest.fn().mockRejectedValue(notImplemented),
            previewEmailMerge: jest.fn().mockRejectedValue(notImplemented),
            getStatusQuery: jest.fn().mockRejectedValue(notImplemented),
            getStatusMessage: jest.fn().mockRejectedValue(notImplemented),
            promoteQuery: jest.fn().mockRejectedValue(notImplemented),
            promoteMessage: jest.fn().mockRejectedValue(notImplemented),
            cancelQuery: jest.fn().mockRejectedValue(notImplemented),
            cancelMessage: jest.fn().mockRejectedValue(notImplemented),
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
    await expect(controller.postEmail({} as never)).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('postMerge throws NotImplementedException', async () => {
    await expect(controller.postMerge({} as never)).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('postPreview throws NotImplementedException', async () => {
    await expect(controller.postPreview({} as never)).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('getStatusQuery throws NotImplementedException', async () => {
    await expect(controller.getStatusQuery({})).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('getStatusMessage throws NotImplementedException', async () => {
    await expect(controller.getStatusMessage('msg-1')).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('postPromoteQuery throws NotImplementedException', async () => {
    await expect(controller.postPromoteQuery({})).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('postPromoteMessage throws NotImplementedException', async () => {
    await expect(controller.postPromoteMessage('msg-1')).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('deleteCancelQuery throws NotImplementedException', async () => {
    await expect(controller.deleteCancelQuery({})).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('deleteCancelMessage throws NotImplementedException', async () => {
    await expect(controller.deleteCancelMessage('msg-1')).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('getHealth returns dependencies array', () => {
    const result = controller.getHealth();
    expect(result).toEqual({ dependencies: [] });
  });
});
