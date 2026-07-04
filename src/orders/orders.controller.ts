import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '../../generated/prisma/client';

// ── USER ──────────────────────────────────────────────────────────────────────

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  // GET /orders — current user's orders
  @Get()
  findMyOrders(@Req() req: any) {
    return this.ordersService.findUserOrders(req.user.sub);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('all')
  findAll() {
    return this.ordersService.findAll();
  }

  // GET /orders/:id — single order
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ordersService.findOneUserOrder(id, req.user.sub);
  }

  // POST /orders — create order from cart
  @Post()
  create(@Req() req: any, @Body() body: {
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    promoCode?: string;
  }) {
    return this.ordersService.createFromCart(req.user.sub, body);
  }


  // ── ADMIN ─────────────────────────────────────────────────────────────────────


  // PUT /orders/:id
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Put(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }
}
