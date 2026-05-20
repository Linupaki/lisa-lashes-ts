import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, } from '@nestjs/common';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('services')
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,) { }

  @Get()
  findAll() {
    return this.serviceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
  create(@Body() createServiceDto: Prisma.salon_servicesCreateInput,) {
    return this.serviceService.create(createServiceDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: Prisma.salon_servicesUpdateInput,) {
    return this.serviceService.update(+id, updateServiceDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceService.remove(+id);
  }
}
