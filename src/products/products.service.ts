import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) { }

  async findAll() {

    return this.db.products.findMany({
      orderBy: { id: 'desc' },
    });
  }


  async findOne(id: number) {
    const product = await this.db.products.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return product;
  }


  async create(data: any) {
    return this.db.products.create({
      data: {
        name: data.name,
        price: new Prisma.Decimal(data.price.toString()),
        stock: data.stock ? Number(data.stock) : 0,
        description: data.description || null,
        category: data.category,
        path: data.path || null,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // UPDATE PRODUCT
  // ════════════════════════════════════════════════════════════════════
  async update(id: number, data: any) {
    await this.findOne(id);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.price) updateData.price = new Prisma.Decimal(data.price.toString());
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.path !== undefined) updateData.path = data.path;

    return this.db.products.update({
      where: { id },
      data: updateData,
    });
  }
  async remove(id: number) {
    await this.findOne(id);

    return this.db.products.delete({
      where: { id },
    });
  }

}
