import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, } from '@nestjs/common';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { ResourceService } from './resource.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('resources')
export class ResourceController {
  constructor(private readonly resourceService: ResourceService,) { }

  @Get()
  findAll() {
    return this.resourceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resourceService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
  create(@Body() createResourceDto: Prisma.resourcesCreateInput,) {
    return this.resourceService.create(createResourceDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResourceDto: Prisma.resourcesUpdateInput,) {
    return this.resourceService.update(+id, updateResourceDto,);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resourceService.remove(+id);
  }
}
