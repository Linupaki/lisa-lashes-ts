import { Test, TestingModule } from '@nestjs/testing';
import { ProductDiscountsService } from './product_discounts.service';

describe('ProductDiscountsService', () => {
  let service: ProductDiscountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDiscountsService],
    }).compile();

    service = module.get<ProductDiscountsService>(ProductDiscountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
