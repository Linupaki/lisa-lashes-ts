import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { generateAvailabilitySlots } from './availability-utils';

@Injectable()
export class BookingSlotService {
  constructor(private readonly db: DatabaseService) {}

  async createFromSlot(
    input: { resourceId: number; serviceId: number; date: string; start: string },
    userId: number,
  ) {
    const { resourceId, serviceId, date, start } = input ?? {};

    if (!resourceId || !serviceId || !date || !start) {
      throw new BadRequestException('resourceId, serviceId, date, start are required');
    }

    const startTime = new Date(`${date}T${start}:00`);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date/start');
    }

    const service = await this.db.salon_services.findUnique({
      where: { id: serviceId },
      select: { duration_minutes: true, active: true },
    });
    if (!service || service.active === false) {
      throw new NotFoundException('Service not found');
    }

    const resource = await this.db.resources.findUnique({
      where: { id: resourceId },
      select: { active: true },
    });
    if (!resource || resource.active === false) {
      throw new NotFoundException('Resource not found');
    }

    const resourceService = await this.db.resource_services.findUnique({
      where: {
        resource_id_service_id: {
          resource_id: resourceId,
          service_id: serviceId,
        },
      },
      select: { resource_id: true },
    });
    if (!resourceService) {
      throw new BadRequestException('This service is not available for selected artist');
    }

    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60_000);

    const dayStartLocal = new Date(`${date}T00:00:00`);
    const weekday = dayStartLocal.getDay();

    const overrideDate = new Date(`${date}T00:00:00.000Z`);
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
      throw new ConflictException('Not working on this date');
    }

    const workingHours =
      scheduleOverride?.working && scheduleOverride.start_time && scheduleOverride.end_time
        ? {
            start_time: scheduleOverride.start_time,
            end_time: scheduleOverride.end_time,
          }
        : await this.db.working_hours.findFirst({
            where: { resource_id: resourceId, weekday },
            select: { start_time: true, end_time: true },
          });

    if (!workingHours) {
      throw new ConflictException('No working hours for this date');
    }

    const dayStart = dayStartLocal;
    const dayEnd = new Date(`${date}T23:59:59.999`);
    const bookings = await this.db.bookings.findMany({
      where: {
        resource_id: resourceId,
        status: { not: 'cancelled' },
        start_time: { gte: dayStart, lt: dayEnd },
      },
      select: { start_time: true, end_time: true, status: true },
    });

    const availableSlots = generateAvailabilitySlots({
      date,
      durationMinutes: service.duration_minutes,
      workingHours,
      bookings,
      stepMinutes: 30,
    });

    if (!availableSlots.includes(start)) {
      throw new ConflictException('Selected slot is not available');
    }

    const user = await this.db.users.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, phone: true, address: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const createData: Prisma.bookingsUncheckedCreateInput = {
      resource_id: resourceId,
      service_id: serviceId,
      user_id: userId,
      customer_name: `${user.first_name} ${user.last_name}`,
      customer_phone: user.phone,
      customer_email: user.address ?? undefined,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
    };

    return this.db.bookings.create({
      data: createData,
    });
  }
}
