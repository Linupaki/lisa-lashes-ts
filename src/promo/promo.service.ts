import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PromoService {
  constructor(private readonly db: DatabaseService) { }

  async findAll() {
    const promos = await this.db.promo_codes.findMany();
    return promos.map(p => ({
      id: p.id,
      code: p.code,
      discountType: p.discount_type,
      discountValue: Number(p.discount_value),
      maxUses: p.max_uses,
      usedCount: p.used_count,
      expiresAt: p.expires_at,
      isActive: p.is_active,
      singleUsePerUser: p.single_use_per_user,
    }));
  }

  async findOneByCode(code: string) {
    const promo = await this.db.promo_codes.findUnique({
      where: { code: code },
    });

    if (!promo || !promo.is_active) {
      return null;
    }

    if (promo.expires_at && new Date() > new Date(promo.expires_at)) {
      return null;
    }

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
    singleUsePerUser?: boolean;
  }) {
    // Normalise to 'percent' or 'fixed' regardless of what the frontend sends
    const dtype = data.discountType.toLowerCase().includes('percent') ? 'percent' : 'fixed';

    return await this.db.promo_codes.create({
      data: {
        code: data.code.toUpperCase(),
        discount_type: dtype,
        discount_value: data.discountValue,
        max_uses: data.maxUses || null,
        expires_at: data.expiresAt ? new Date(data.expiresAt) : null,
        is_active: true,
        single_use_per_user: data.singleUsePerUser ?? false,
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
