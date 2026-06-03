import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProductTypesService {
  constructor(private prisma: DatabaseService) { }

  async create(name: string) {
    const exists = await this.prisma.product_types.findUnique({ where: { name } });
    if (exists) throw new ConflictException('Product type already exists');

    return this.prisma.product_types.create({ data: { name } });
  }

  async findAll() {
    return this.prisma.product_types.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, name: string) {
    const type = await this.prisma.product_types.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Product type not found');

    return this.prisma.product_types.update({
      where: { id },
      data: { name },
    });
  }

  async remove(id: number) {
    const type = await this.prisma.product_types.findUnique({ where: { id } });
    if (!type) throw new NotFoundException('Product type not found');

    return this.prisma.product_types.delete({ where: { id } });
  }
}
