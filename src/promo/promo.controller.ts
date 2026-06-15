<<<<<<< Updated upstream
import { Controller, Get, Post, Query, Body, Patch, Param, Delete, NotFoundException, BadRequestException, UseGuards, } from '@nestjs/common';
import { PromoService } from './promo.service';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard} from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService,) { }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Get()
  findAll() {
    return this.promoService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.user)
  @Get('validate')
  async validate(@Query('code') code: string) {
=======
import { Controller, Get, Post, Query, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { PromoService } from './promo.service';

@Controller('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get()
  async findOne(@Query('code') code: string) {
>>>>>>> Stashed changes
    if (!code) {
      throw new BadRequestException('Promo code is required');
    }

    const promo = await this.promoService.findOneByCode(code.trim());

    if (!promo) {
      throw new NotFoundException('Invalid, expired, or fully used promo code');
    }

    return promo;
  }
<<<<<<< Updated upstream
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
=======

>>>>>>> Stashed changes
  @Post()
  async create(
    @Body() dto: { 
      code: string; 
      discountType: string; 
      discountValue: number; 
      maxUses?: number; 
      expiresAt?: string 
    }
  ) {
    if (!dto.code || !dto.discountType || dto.discountValue === undefined) {
      throw new BadRequestException('Missing required fields (code, discountType, discountValue)');
    }
    return await this.promoService.createPromo(dto);
  }
<<<<<<< Updated upstream

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePromoDto: Prisma.promo_codesUpdateInput,) {
    return this.promoService.update(+id, updatePromoDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promoService.remove(+id);
  }
=======
>>>>>>> Stashed changes
}
