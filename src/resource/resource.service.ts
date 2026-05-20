import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ResourceService {
  constructor(
    private readonly db: DatabaseService,
  ) {}

  async create( createResourceDto: Prisma.resourcesCreateInput,) {
    return this.db.resources.create({data: createResourceDto,});
  }

  async findAll() {
    const resources = await this.db.resources.findMany({
      where: {
        active: true,
      },
      include: {
        resource_services: {
          include: {
            salon_services: true,
          },
        },
      },
    });

    return resources.map((r) => ({
      id: r.id,
      name: r.name,
      active: r.active,
      services: (r.resource_services ?? []).map((rs) => rs.salon_services),
    }));
  }

  async findOne(id: number) {
    return this.db.resources.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateResourceDto: Prisma.resourcesUpdateInput,) {
    return this.db.resources.update({
      where: { id },
      data: updateResourceDto,
    });
  }

  async remove(id: number) {
    return this.db.resources.delete({
      where: { id },
    });
  }
}