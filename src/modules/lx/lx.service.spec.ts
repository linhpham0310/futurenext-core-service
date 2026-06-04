import { Test, TestingModule } from '@nestjs/testing';
import { LxService } from './lx.service';

describe('LxService', () => {
  let service: LxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LxService],
    }).compile();

    service = module.get<LxService>(LxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
