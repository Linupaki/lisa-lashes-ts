import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class ProductDiscountService {
  constructor(private readonly db: DatabaseService) { }

  // ════════════════════════════════════════════════════════════════════
  // GET discount for a product
  // ════════════════════════════════════════════════════════════════════
  async findByProduct(productId: number) {
    const product = await this.db.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);

    return this.db.product_discounts.findUnique({
      where: { product_id: productId },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // CREATE or UPDATE discount for a product (upsert)
  // ════════════════════════════════════════════════════════════════════
  async upsert(productId: number, data: {
    discount_value: number;
    discount_type: 'fixed' | 'percentage';
    discount_label: string;
    start_time: string;
    end_time: string;
  }) {
    const product = await this.db.products.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found.`);

    if (!data.discount_value || data.discount_value <= 0) {
      throw new BadRequestException('Discount value must be greater than 0.');
    }

    if (!data.start_time || !data.end_time) {
      throw new BadRequestException('Start time and end time are required.');
    }

    if (new Date(data.end_time) <= new Date(data.start_time)) {
      throw new BadRequestException('End time must be after start time.');
    }

    const discountData = {
      discount_value: new Prisma.Decimal(data.discount_value.toString()),
      discount_type: data.discount_type,
      discount_label: data.discount_label || '',
      start_time: new Date(data.start_time),
      end_time: new Date(data.end_time),
    };

    return this.db.product_discounts.upsert({
      where: { product_id: productId },
      update: discountData,
      create: { product_id: productId, ...discountData },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // DELETE discount for a product
  // ════════════════════════════════════════════════════════════════════
  async remove(productId: number) {
    const discount = await this.db.product_discounts.findUnique({
      where: { product_id: productId },
    });
    if (!discount) throw new NotFoundException(`No discount found for product ID ${productId}.`);

    return this.db.product_discounts.delete({ where: { product_id: productId } });
  }

  // ════════════════════════════════════════════════════════════════════
  // GET all active discounts (for admin overview)
  // ════════════════════════════════════════════════════════════════════
  async findAllActive() {
    const now = new Date();
    return this.db.product_discounts.findMany({
      where: {
        start_time: { lte: now },
        end_time: { gte: now },
      },
      include: {
        product: { select: { id: true, name: true, price: true, path: true } },
      },
      orderBy: { end_time: 'asc' },
    });
  }
}
