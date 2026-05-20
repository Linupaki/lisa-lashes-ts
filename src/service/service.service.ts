import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ServiceService {
  constructor(private readonly db: DatabaseService,) { }

  async create(createServiceDto: Prisma.salon_servicesCreateInput,) {
    return this.db.salon_services.create({data: createServiceDto,});
  }

  async findAll() {
    return this.db.salon_services.findMany({
      where: {
        active: true,
      },
    });
  }

  async findOne(id: number) {
    return this.db.salon_services.findUnique({
      where: { id },
    });
  }

  async update(id: number,updateServiceDto: Prisma.salon_servicesUpdateInput,) {
    return this.db.salon_services.update({
      where: { id },
      data: updateServiceDto,
    });
  }

  async remove(id: number) {
    return this.db.salon_services.delete({
      where: { id },
    });
  }
}