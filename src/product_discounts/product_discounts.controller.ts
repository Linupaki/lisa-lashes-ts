import { Controller, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductDiscountService } from './product-discount.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';

@Controller('products')
export class ProductDiscountController {
  constructor(private readonly productDiscountService: ProductDiscountService) { }

  // GET /products/:id/discount — get discount for a product (public)
  @Get(':id/discount')
  findByProduct(@Param('id') id: string) {
    return this.productDiscountService.findByProduct(+id);
  }

  // GET /products/discounts/active — all currently active discounts (admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('discounts/active')
  findAllActive() {
    return this.productDiscountService.findAllActive();
  }

  // PUT /products/:id/discount — create or update discount (admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Put(':id/discount')
  upsert(
    @Param('id') id: string,
    @Body() body: {
      discount_value: number;
      discount_type: 'fixed' | 'percentage';
      discount_label: string;
      start_time: string;
      end_time: string;
    },
  ) {
    return this.productDiscountService.upsert(+id, body);
  }

  // DELETE /products/:id/discount — remove discount (admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete(':id/discount')
  remove(@Param('id') id: string) {
    return this.productDiscountService.remove(+id);
  }
}
