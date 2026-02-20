import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotImplementedException } from '@nestjs/common';
import { ChesController } from '../../../../src/ches/v1/core/ches.controller';

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
      ],
    }).compile();

    controller = module.get(ChesController);
  });

  it('postEmail throws NotImplementedException', () => {
    expect(() => controller.postEmail()).toThrow(NotImplementedException);
  });

  it('postMerge throws NotImplementedException', () => {
    expect(() => controller.postMerge()).toThrow(NotImplementedException);
  });

  it('postPreview throws NotImplementedException', () => {
    expect(() => controller.postPreview()).toThrow(NotImplementedException);
  });

  it('getStatusQuery throws NotImplementedException', () => {
    expect(() => controller.getStatusQuery()).toThrow(NotImplementedException);
  });

  it('getStatusMessage throws NotImplementedException', () => {
    expect(() => controller.getStatusMessage()).toThrow(
      NotImplementedException,
    );
  });

  it('postPromoteQuery throws NotImplementedException', () => {
    expect(() => controller.postPromoteQuery()).toThrow(
      NotImplementedException,
    );
  });

  it('postPromoteMessage throws NotImplementedException', () => {
    expect(() => controller.postPromoteMessage()).toThrow(
      NotImplementedException,
    );
  });

  it('deleteCancelQuery throws NotImplementedException', () => {
    expect(() => controller.deleteCancelQuery()).toThrow(
      NotImplementedException,
    );
  });

  it('deleteCancelMessage throws NotImplementedException', () => {
    expect(() => controller.deleteCancelMessage()).toThrow(
      NotImplementedException,
    );
  });

  it('getHealth returns dependencies array', () => {
    const result = controller.getHealth();
    expect(result).toEqual({ dependencies: [] });
  });
});
