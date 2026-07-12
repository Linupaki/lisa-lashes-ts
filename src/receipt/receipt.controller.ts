import { Controller, Get, Param, ParseIntPipe, UseGuards, Req, Res } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { Response } from 'express';

// ── USER — own orders only ────────────────────────────────────────────────────

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Get(':id/receipt')
  downloadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.receiptService.generateOrderReceipt(id, req.user.sub, false, res);
  }
}

// ── ADMIN — any order ─────────────────────────────────────────────────────────

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class AdminReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Get(':id/receipt')
  downloadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.receiptService.generateOrderReceipt(id, req.user.sub, true, res);
  }
}
