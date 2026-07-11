import { Module } from '@nestjs/common';
import { ProductDiscountService } from './product_discounts.service';
import { ProductDiscountController } from './product_discounts.controller';

@Module({
  controllers: [ProductDiscountController],
  providers: [ProductDiscountService],
})
export class ProductDiscountsModule { }
