import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ResourceService {
  constructor(
    private readonly db: DatabaseService,
  ) { }

  async create(createResourceDto: Prisma.resourcesCreateInput,) {
    return this.db.resources.create({ data: createResourceDto, });
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
      // 1. Send user_id back to the frontend so your dropdowns can see who is linked!
      user_id: (r as any).user_id ?? null,
      services: (r.resource_services ?? []).map((rs) => rs.salon_services),
    }));
  }

  async findOne(id: number) {
    return this.db.resources.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateResourceDto: any) {
    // 2. Destructure user_id from your frontend payload
    const { name, active, service_ids, user_id } = updateResourceDto;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (active !== undefined) updateData.active = active;

    // 3. Directly set the foreign key scalar column
    if (user_id !== undefined) {
      updateData.user_id = (user_id === null || user_id === '') ? null : Number(user_id);
    }

    if (service_ids && Array.isArray(service_ids)) {
      updateData.resource_services = {
        deleteMany: {},
        createMany: {
          data: service_ids.map((serviceId: number) => ({
            service_id: serviceId,
          })),
        },
      };
    }

    return this.db.resources.update({
      where: { id },
      data: updateData as Prisma.resourcesUpdateInput,
    });
  }

  async remove(id: number) {
    return this.db.resources.delete({
      where: { id },
    });
  }
}
