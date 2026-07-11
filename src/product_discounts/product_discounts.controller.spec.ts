import { Test, TestingModule } from '@nestjs/testing';
import { ProductDiscountsController } from './product_discounts.controller';
import { ProductDiscountsService } from './product_discounts.service';

describe('ProductDiscountsController', () => {
  let controller: ProductDiscountsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductDiscountsController],
      providers: [ProductDiscountsService],
    }).compile();

    controller = module.get<ProductDiscountsController>(ProductDiscountsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
