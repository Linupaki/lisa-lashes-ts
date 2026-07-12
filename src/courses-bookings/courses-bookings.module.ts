import { Module } from '@nestjs/common';
import { CoursesBookingsService } from './courses-bookings.service';
import { CoursesBookingsController } from './courses-bookings.controller';

@Module({
  controllers: [CoursesBookingsController],
  providers: [CoursesBookingsService],
})
export class CoursesBookingsModule {}
