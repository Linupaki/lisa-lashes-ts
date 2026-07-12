import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
@Controller('cart')
@UseGuards(JwtAuthGuard) // all cart routes require login
export class CartController {
  constructor(private readonly cartService: CartService) { }

  // GET /cart — get current user's cartService
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  getCart(@Req() req: any) {
    return this.cartService.getCart(req.user.sub);
  }

  // POST /cart — add item { productId, quantity? }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  addItem(@Req() req: any, @Body() body: { productId: number; quantity?: number }) {
    return this.cartService.addItem(req.user.sub, body.productId, body.quantity || 1);
  }

  // PATCH /cart/:productId — update quantity { quantity }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':productId')
  updateQuantity(
    @Req() req: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateQuantity(req.user.sub, productId, body.quantity);
  }

  // DELETE /cart/:productId — remove one item
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':productId')
  removeItem(@Req() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.cartService.removeItem(req.user.sub, productId);
  }

  // DELETE /cart — clear entire cart
  //
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete()
  clearCart(@Req() req: any) {
    return this.cartService.clearCart(req.user.sub);
  }
}
