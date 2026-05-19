import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Prisma } from '../../generated/prisma/client'
import { JwtAuthGuard} from '../auth/jwt-auth.guard';

@Controller('booking')
export class BookingController {
  constructor (private readonly bookingService: BookingService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createBookingDto: Prisma.bookingsCreateInput) {
    return this.bookingService.create(createBookingDto, req.user.sub);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookingDto: Prisma.bookingsUpdateInput) {
    return this.bookingService.update(+id, updateBookingDto);
  }

  @Delete(':id')
  remove(@Param('id') id:string) {
    return this.bookingService.remove(+id);
  }
}
