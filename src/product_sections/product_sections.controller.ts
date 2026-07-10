import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { user_roles } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductSectionDto, ProductSectionsService } from './product_sections.service';

@Controller('product-sections')
export class ProductSectionsController {
  constructor(private readonly productSectionsService: ProductSectionsService) { }

  @Get('product/:productId')
  findAllPublic(@Param('productId') productId: string) {
    return this.productSectionsService.listPublic(+productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('admin')
  findAllAdmin(@Query('productId') productId: string) {
    return this.productSectionsService.listAdmin(+productId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Post('admin')
  create(@Query('productId') productId: string, @Body() dto: ProductSectionDto) {
    return this.productSectionsService.create(+productId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Put('admin')
  update(@Query('id') id: string, @Body() dto: ProductSectionDto) {
    return this.productSectionsService.update(+id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete('admin')
  remove(@Query('id') id: string) {
    return this.productSectionsService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Put('admin/reorder')
  reorder(@Query('productId') productId: string, @Body('orderedIds') orderedIds: number[]) {
    return this.productSectionsService.reorder(+productId, orderedIds);
  }
}
