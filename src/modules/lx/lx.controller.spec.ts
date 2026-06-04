import { Test, TestingModule } from '@nestjs/testing';
import { LxController } from './lx.controller';

describe('LxController', () => {
  let controller: LxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LxController],
    }).compile();

    controller = module.get<LxController>(LxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
