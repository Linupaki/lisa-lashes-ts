import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) { }

  private deleteFileFromDisk(fileName: string | null | undefined) {
    if (!fileName) return;

    const absoluteFilePath = path.join(
      process.cwd(),
      'front_admin',
      'uploads',
      'products',
      fileName
    );

    try {
      if (fs.existsSync(absoluteFilePath)) {
        fs.unlinkSync(absoluteFilePath);
        console.log(`[Storage Cleanup] Successfully removed file: ${fileName}`);
      } else {
        console.warn(`[Storage Cleanup] File not found on disk at: ${absoluteFilePath}`);
      }
    } catch (error) {
      console.error(`[Storage Cleanup] Error unlinking file path: ${absoluteFilePath}`, error);
    }
  }

  async findAll() {
    return this.db.products.findMany({
      orderBy: { id: 'desc' },
      include: { product_type: true },
    });
  }

  async findOne(id: number) {
    const product = await this.db.products.findUnique({
      where: { id },
      include: { product_type: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return product;
  }

  async findSliderProducts() {
    return this.db.products.findMany({
      where: { in_slider: true },
      orderBy: { id: 'desc' },
      include: { product_type: true },
    });
  }

  async findActiveProducts() {
    return this.db.products.findMany({
      where: { is_active: true },
      orderBy: { id: 'desc' },
      include: { product_type: true },
    });
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
        in_slider: data.in_slider,
        is_active: data.is_active,
        product_type_id: data.product_type_id ? Number(data.product_type_id) : null,
      },
      include: { product_type: true },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // UPDATE PRODUCT
  // ════════════════════════════════════════════════════════════════════
  async update(id: number, data: any) {
    const currentProduct = await this.db.products.findUnique({ where: { id } });
    if (!currentProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const newPathString = data.path as string | undefined;
    if (newPathString && currentProduct.path && currentProduct.path !== newPathString) {
      this.deleteFileFromDisk(currentProduct.path);
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.price) updateData.price = new Prisma.Decimal(data.price.toString());
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.path !== undefined) updateData.path = data.path;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.in_slider !== undefined) updateData.in_slider = data.in_slider;

    // product_type_id: empty string means "unassign", a number means "assign"
    if (data.product_type_id !== undefined) {
      updateData.product_type_id = data.product_type_id ? Number(data.product_type_id) : null;
    }

    return this.db.products.update({
      where: { id },
      data: updateData,
      include: { product_type: true },
    });
  }

  async remove(id: number) {
    const product = await this.db.products.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    this.deleteFileFromDisk(product.path);
    return this.db.products.delete({
      where: { id },
    });
  }
}
