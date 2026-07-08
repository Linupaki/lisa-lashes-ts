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
  ) { }

  async create(createBookingDto: Prisma.bookingsCreateInput, userId: number,) {
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

  async getAvailability(resourceId: number, serviceId: number, date: string) {
    if (!resourceId || !serviceId) {
      throw new BadRequestException('resourceId and serviceId are required');
    }

    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) {
      throw new BadRequestException('Invalid date. Expected YYYY-MM-DD');
    }

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    const weekday = dayStart.getDay();
    const overrideDate = new Date(Date.UTC(year, month - 1, day));

    const service = await this.db.salon_services.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const scheduleOverride = await this.db.schedule_overrides.findFirst({
      where: { resource_id: resourceId, date: overrideDate },
      select: { working: true, start_time: true, end_time: true },
    });

    if (scheduleOverride && scheduleOverride.working === false) {
      return [];
    }

    const workingHours =
      scheduleOverride?.working && scheduleOverride.start_time && scheduleOverride.end_time
        ? { start_time: scheduleOverride.start_time, end_time: scheduleOverride.end_time }
        : await this.db.working_hours.findFirst({
          where: { resource_id: resourceId, weekday },
        });

    if (!workingHours) {
      return [];
    }

    const bookings = await this.db.bookings.findMany({
      where: {
        resource_id: resourceId,
        status: { not: 'cancelled' },
        start_time: { gte: dayStart, lt: dayEnd },
      },
      select: { start_time: true, end_time: true, status: true },
    });

    const slots = generateAvailabilitySlots({
      date,
      durationMinutes: service.duration_minutes,
      workingHours,
      bookings,
      stepMinutes: 30,
    });

    return slots;
  }

  async findByUser(userId: number) {
    return this.db.bookings.findMany({
      where: { user_id: userId },
      orderBy: { start_time: 'desc' },
      include: {
        resources: { select: { id: true, name: true } },
        salon_services: { select: { id: true, name: true, price: true, duration_minutes: true } },
      },
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

  async update(id: number, updateBookingDto: Prisma.bookingsUpdateInput) {
    const data: Prisma.bookingsUpdateInput = { ...updateBookingDto };
    if (data.start_time && typeof data.start_time === 'string') {

      const timeStr = data.start_time.endsWith('Z') ? data.start_time : `${data.start_time}Z`;
      data.start_time = new Date(timeStr);
    }

    if (data.end_time && typeof data.end_time === 'string') {
      const timeStr = data.end_time.endsWith('Z') ? data.end_time : `${data.end_time}Z`;
      data.end_time = new Date(timeStr);
    }

    return this.db.bookings.update({
      where: { id },
      data: data,
    });

  } async remove(id: number) {
    return this.db.bookings.delete({
      where: { id },
    });
  }
}
