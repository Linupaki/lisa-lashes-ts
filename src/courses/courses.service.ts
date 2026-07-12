import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private readonly db: DatabaseService) { }

  // GET all — public (active only) or admin (all)
  async findAll(adminView = false) {
    return this.db.courses.findMany({
      where: adminView ? undefined : { is_active: true },
      orderBy: { date: 'asc' },
    });
  }

  // GET one
  async findOne(id: number) {
    const course = await this.db.courses.findUnique({ where: { id } });
    if (!course) throw new NotFoundException(`Course with ID ${id} not found.`);
    return course;
  }

  // POST create
  async create(data: any) {
    return this.db.courses.create({
      data: {
        title: data.title,
        description: data.description || null,
        instructor: data.instructor || null,
        date: data.date ? new Date(data.date) : null,
        time_start: data.time_start || null,
        time_end: data.time_end || null,
        location: data.location || null,
        spots: data.spots ? Number(data.spots) : null,
        price: new Prisma.Decimal(data.price.toString()),
        certificate: data.certificate === 'true' || data.certificate === true,
        image_path: data.image_path || null,
        is_active: data.is_active !== 'false' && data.is_active !== false,
      },
    });
  }

  // PUT update
  async update(id: number, data: any) {
    await this.findOne(id);
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.instructor !== undefined) updateData.instructor = data.instructor || null;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : null;
    if (data.time_start !== undefined) updateData.time_start = data.time_start || null;
    if (data.time_end !== undefined) updateData.time_end = data.time_end || null;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.spots !== undefined) updateData.spots = data.spots ? Number(data.spots) : null;
    if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price.toString());
    if (data.certificate !== undefined) updateData.certificate = data.certificate === 'true' || data.certificate === true;
    if (data.image_path !== undefined) updateData.image_path = data.image_path || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active !== 'false' && data.is_active !== false;
    return this.db.courses.update({ where: { id }, data: updateData });
  }

  // DELETE
  async remove(id: number) {
    await this.findOne(id);
    return this.db.courses.delete({ where: { id } });
  }

  // Upload image
  async updateImage(id: number, imagePath: string) {
    await this.findOne(id);
    return this.db.courses.update({ where: { id }, data: { image_path: imagePath } });
  }
}
