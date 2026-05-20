import { Module } from '@nestjs/common';
import { BookingService} from './booking.service';
import { BookingController } from './booking.controller';
import { DatabaseModule } from '../database/database.module';
import { BookingSlotService } from './booking-slot.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BookingController],
  providers: [BookingService, BookingSlotService],
})
export class BookingModule { }
