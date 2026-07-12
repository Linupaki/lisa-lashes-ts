import { Test, TestingModule } from '@nestjs/testing';
import { ReciptService } from './recipt.service';

describe('ReciptService', () => {
  let service: ReciptService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReciptService],
    }).compile();

    service = module.get<ReciptService>(ReciptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
