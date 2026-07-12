import { Test, TestingModule } from '@nestjs/testing';
import { ReciptController } from './recipt.controller';
import { ReciptService } from './recipt.service';

describe('ReciptController', () => {
  let controller: ReciptController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReciptController],
      providers: [ReciptService],
    }).compile();

    controller = module.get<ReciptController>(ReciptController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
