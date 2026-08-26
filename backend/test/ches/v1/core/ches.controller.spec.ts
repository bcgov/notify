import { Test, TestingModule } from '@nestjs/testing';
import { ChesController } from '../../../../src/ches/v1/core/ches.controller';
import { ChesService } from '../../../../src/ches/ches.service';

describe('ChesController', () => {
  let controller: ChesController;

  const mockChesService = {
    sendEmail: jest.fn().mockResolvedValue({ txId: 'tx-1', messages: [] }),
    sendEmailMerge: jest.fn().mockResolvedValue([]),
    previewEmailMerge: jest.fn().mockResolvedValue([]),
    getStatusQuery: jest.fn().mockResolvedValue([]),
    getStatusMessage: jest.fn().mockResolvedValue({}),
    promoteQuery: jest.fn().mockResolvedValue(undefined),
    promoteMessage: jest.fn().mockResolvedValue(undefined),
    cancelQuery: jest.fn().mockResolvedValue(undefined),
    cancelMessage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChesController],
      providers: [
        {
          provide: ChesService,
          useValue: mockChesService,
        },
      ],
    }).compile();

    controller = module.get(ChesController);
  });

  it('postEmail delegates to ChesService', async () => {
    const body = {
      from: 'a@b.com',
      to: ['c@d.com'],
      subject: 'Test',
      body: 'Hello',
      bodyType: 'html',
    } as never;
    const result = await controller.postEmail(body);
    expect(mockChesService.sendEmail).toHaveBeenCalledWith(body);
    expect(result).toEqual({ txId: 'tx-1', messages: [] });
  });

  it('postMerge delegates to ChesService', async () => {
    const result = await controller.postMerge({} as never);
    expect(mockChesService.sendEmailMerge).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('postPreview delegates to ChesService', async () => {
    const result = await controller.postPreview({} as never);
    expect(mockChesService.previewEmailMerge).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getStatusQuery delegates to ChesService', async () => {
    const result = await controller.getStatusQuery({});
    expect(mockChesService.getStatusQuery).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('getStatusMessage delegates to ChesService', async () => {
    const result = await controller.getStatusMessage('msg-1');
    expect(mockChesService.getStatusMessage).toHaveBeenCalledWith('msg-1');
    expect(result).toEqual({});
  });

  it('postPromoteQuery delegates to ChesService', async () => {
    await controller.postPromoteQuery({});
    expect(mockChesService.promoteQuery).toHaveBeenCalled();
  });

  it('postPromoteMessage delegates to ChesService', async () => {
    await controller.postPromoteMessage('msg-1');
    expect(mockChesService.promoteMessage).toHaveBeenCalledWith('msg-1');
  });

  it('deleteCancelQuery delegates to ChesService', async () => {
    await controller.deleteCancelQuery({});
    expect(mockChesService.cancelQuery).toHaveBeenCalled();
  });

  it('deleteCancelMessage delegates to ChesService', async () => {
    await controller.deleteCancelMessage('msg-1');
    expect(mockChesService.cancelMessage).toHaveBeenCalledWith('msg-1');
  });

  it('getHealth returns dependencies array', () => {
    const result = controller.getHealth();
    expect(result).toEqual({ dependencies: [] });
  });
});
