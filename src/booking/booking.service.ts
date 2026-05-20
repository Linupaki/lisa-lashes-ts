import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { generateAvailabilitySlots } from './availability-utils';
import { BookingSlotService } from './booking-slot.service';

@Injectable()
export class BookingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly bookingSlotService: BookingSlotService,
  ) {}

  async create( createBookingDto: Prisma.bookingsCreateInput, userId: number,) {
    return this.db.bookings.create({
      data: {
        ...createBookingDto,

        users: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async createFromSlot(
    input: { resourceId: number; serviceId: number; date: string; start: string },
    userId: number,
  ) {
    return this.bookingSlotService.createFromSlot(input, userId);
  }

  async getAvailability(resourceId: number, serviceId: number, date: string,) {
    if (!resourceId || !serviceId) {
      throw new BadRequestException('resourceId and serviceId are required');
    }

    const dayStart = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD');
    }
    const dayEnd = new Date(`${date}T23:59:59.999`);

    const overrideDate = new Date(`${date}T00:00:00.000Z`);

    const service = await this.db.salon_services.findUnique({
      where: {
        id: serviceId,
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const durationMinutes = service.duration_minutes;

    const weekday = dayStart.getDay();

    const scheduleOverride = await this.db.schedule_overrides.findFirst({
      where: {
        resource_id: resourceId,
        date: overrideDate,
      },
      select: {
        working: true,
        start_time: true,
        end_time: true,
      },
    });

    if (scheduleOverride && scheduleOverride.working === false) {
      return [];
    }

    const workingHours =
      scheduleOverride?.working && scheduleOverride.start_time && scheduleOverride.end_time
        ? {
            start_time: scheduleOverride.start_time,
            end_time: scheduleOverride.end_time,
          }
        : await this.db.working_hours.findFirst({
            where: {
              resource_id: resourceId,
              weekday,
            },
          });

    if (!workingHours) {
      return [];
    }

    const bookings = await this.db.bookings.findMany({
      where: {
        resource_id: resourceId,
        status: {
          not: 'cancelled',
        },
        start_time: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
      select: {
        start_time: true,
        end_time: true,
        status: true,
      },
    });

    return generateAvailabilitySlots({
      date,
      durationMinutes,
      workingHours,
      bookings,
      stepMinutes: 30,
    });
  }

  async findAll() {
    return this.db.bookings.findMany();
  }

  async findOne(id: number) {
    return this.db.bookings.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateBookingDto: Prisma.bookingsUpdateInput,) {
    return this.db.bookings.update({
      where: { id },
      data: updateBookingDto,
    });
  }

  async remove(id: number) {
    return this.db.bookings.delete({
      where: { id },
    });
  }
}