import { Controller, Get, Post, Query, Body, Patch, Param, Delete, NotFoundException, BadRequestException, UseGuards, UseInterceptors } from '@nestjs/common';
import { PromoService } from './promo.service';
import { Prisma, user_roles } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService,) { }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Get()
  findAll() {
    return this.promoService.findAll();
  }
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('validate')
  async validate(@Query('code') code: string) {
    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const promo = await this.promoService.findOneByCode(code.trim());

    if (!promo) {
      throw new NotFoundException('Invalid, expired, or fully used promo code');
    }

    return promo;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
  async create(
    @Body() dto: {
      code: string;
      discountType: string;
      discountValue: number;
      maxUses?: number;
      expiresAt?: string;
      singleUsePerUser?: boolean;
      isActive?: boolean;
    }
  ) {
    if (!dto.code || !dto.discountType || dto.discountValue === undefined) {
      throw new BadRequestException('Missing required fields (code, discountType, discountValue)');
    }
    return await this.promoService.createPromo(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: {
      code?: string;
      discountType?: string;
      discountValue?: number;
      maxUses?: number;
      expiresAt?: string;
      singleUsePerUser?: boolean;
      isActive?: boolean;
    },
  ) {
    const dtype = dto.discountType
      ? (dto.discountType.toLowerCase().includes('percent') ? 'percent' : 'fixed')
      : undefined;

    return this.promoService.update(+id, {
      code: dto.code?.toUpperCase(),
      discount_type: dtype,
      discount_value: dto.discountValue,
      max_uses: dto.maxUses,
      expires_at: dto.expiresAt
        ? new Date(dto.expiresAt)
        : null,
      single_use_per_user: dto.singleUsePerUser,
      is_active: dto.isActive,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoService.remove(+id);
  }
}
