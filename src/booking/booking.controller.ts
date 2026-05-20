import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Prisma } from '../../generated/prisma/client'
import { JwtAuthGuard} from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('booking')
export class BookingController {
  constructor (private readonly bookingService: BookingService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createBookingDto: Prisma.bookingsCreateInput) {
    return this.bookingService.create(createBookingDto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
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

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @Roles('admin', 'master')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: Prisma.bookingsUpdateInput) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Roles('admin', 'master')
  @Delete(':id')
  remove(@Param('id') id:string) {
    return this.bookingService.remove(+id);
  }
}
