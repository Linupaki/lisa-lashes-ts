import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cart')
@UseGuards(JwtAuthGuard) // all cart routes require login
export class CartController {
  constructor(private readonly cartService: CartService) { }

  // GET /cart — get current user's cart
  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.sub);
  }

  // POST /cart — add item { productId, quantity? }
  @Post()
  addItem(@Req() req: any, @Body() body: { productId: number; quantity?: number }) {
    return this.cartService.addItem(req.user.sub, body.productId, body.quantity || 1);
  }

  // PATCH /cart/:productId — update quantity { quantity }
  @Patch(':productId')
  updateQuantity(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(req.user.sub, productId, body.quantity);
  }

  // DELETE /cart/:productId — remove one item
  @Delete(':productId')
  removeItem(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.cartService.removeItem(req.user.sub, productId);
  }

  // DELETE /cart — clear entire cart
  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.sub);
  }
}
