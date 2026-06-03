import { Controller, Get, Post, Put, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ProductTypesService } from './product_types.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('product-types')
export class ProductTypesController {
  constructor(private productTypesService: ProductTypesService) { }

  @Get()
  findAll() {
    return this.productTypesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body('name') name: string) {
    return this.productTypesService.create(name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put()
  update(@Query('id') id: string, @Body('name') name: string) {
    return this.productTypesService.update(+id, name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete()
  remove(@Query('id') id: string) {
    return this.productTypesService.remove(+id);
  }
}
