import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CartService } from './cart.service';
import { ProductsService } from '../products/products.service';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';



@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  findAll() {
    return this.cartService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cartService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.user)
  @Post()
  create(@Body() createCartDto: Prisma.cartsCreateInput) {
    return this.cartService.create(createCartDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.user)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCartDto: Prisma.cartsUpdateInput,) {
    return this.cartService.update(+id, updateCartDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.user)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cartService.remove(+id);
  }

}
