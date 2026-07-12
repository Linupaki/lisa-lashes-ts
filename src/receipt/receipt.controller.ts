import { Controller, Get, Param, ParseIntPipe, UseGuards, Req, Res } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { Response } from 'express';

// ── USER ──────────────────────────────────────────────────────────────────────

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  // Product order receipt
  @Get('order/:id')
  orderReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateOrderReceipt(id, req.user.sub, false, res);
  }

  // Salon booking receipt
  @Get('booking/:id')
  bookingReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateBookingReceipt(id, req.user.sub, false, res);
  }

  // Course booking receipt
  @Get('course-booking/:id')
  courseBookingReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateCourseReceipt(id, req.user.sub, false, res);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

@Controller('admin/receipts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class AdminReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Get('order/:id')
  orderReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateOrderReceipt(id, req.user.sub, true, res);
  }

  @Get('booking/:id')
  bookingReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateBookingReceipt(id, req.user.sub, true, res);
  }

  @Get('course-booking/:id')
  courseBookingReceipt(@Param('id', ParseIntPipe) id: number, @Req() req: any, @Res() res: Response) {
    return this.receiptService.generateCourseReceipt(id, req.user.sub, true, res);
  }
}
