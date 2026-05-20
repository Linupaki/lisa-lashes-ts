import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ScheduleService {

  createFromSlot(body: {
    resourceId: number;
    serviceId: number;
    date: string; // YYYY-MM-DD
    start: string; // HH:mm
    end: string // HH:mm
  }) {
    return 'This action adds a new schedule override';
  }

  getAffected(start_time: string, end_time: string, date: string) {

  }

  findAll() {
    return `This action returns all schedule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} schedule`;
  }

  update(id: number, updateScheduleDto: Prisma.schedule_overridesUpdateInput) {
    return `This action updates a #${id} schedule`;
  }

  remove(id: number) {
    return `This action removes a #${id} schedule`;
  }
}
