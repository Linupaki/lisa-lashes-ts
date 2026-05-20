import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Prisma, user_roles } from '../../generated/prisma/client'
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)// JWT should be first to fill the user_roles first
  @Post()
  create(@Req() req, @Body() createBookingDto: Prisma.bookingsCreateInput) {
    return this.bookingService.create(createBookingDto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('slot')
  createFromSlot(
    @Req() req,
    @Body()
    body: {
      resourceId: number;
      serviceId: number;
      date: string; // YYYY-MM-DD
      start: string; // HH:mm
    },
  ) {
    return this.bookingService.createFromSlot(body, req.user.sub);
  }

  @Get('availability')
  getAvailability(
    @Query('resourceId') resourceId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,) {
    return this.bookingService.getAvailability(+resourceId, +serviceId, date,);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get()
  findAll() {
    return this.bookingService.findAll();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: Prisma.bookingsUpdateInput) {
    return this.bookingService.update(+id, updateBookingDto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingService.remove(+id);
  }
}
