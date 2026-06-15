import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PromoService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.promo_codes.findMany();
  }
  
  async findOneByCode(code: string) {
    const promo = await this.db.promo_codes.findUnique({
      where: { code: code },
    });

    // 1. Check if it exists and is active
    if (!promo || !promo.is_active) {
      return null;
    }

    // 2. Check expiration date (if set)
    if (promo.expires_at && new Date() > new Date(promo.expires_at)) {
      return null;
    }

    // 3. Check usage limit (if max_uses set)
    if (promo.max_uses !== null && promo.used_count !== null) {
      if (promo.used_count >= promo.max_uses) {
        return null;
      }
    }

    // Return data, converting Decimal to number
    return {
      discountValue: Number(promo.discount_value),
      discountType: promo.discount_type,
    };
  }

  async createPromo(data: {
    code: string;
    discountType: string;
    discountValue: number;
    maxUses?: number;
    expiresAt?: string;
  }) {
    return await this.db.promo_codes.create({
      data: {
        code: data.code.toUpperCase(),
        discount_type: data.discountType,
        discount_value: data.discountValue,
        max_uses: data.maxUses || null,
        expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
        is_active: true,
      },
    });
  }

  async update(id: number, updatePromoDto: Prisma.promo_codesUpdateInput) {
    return this.db.promo_codes.update({
      where: { id },
      data: updatePromoDto,
    });
  }

  async remove(id: number) {
    return this.db.promo_codes.delete({
      where: { id },
    });
  }
}
