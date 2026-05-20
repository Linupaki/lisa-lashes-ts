import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, Res, ParseIntPipe } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { Prisma, user_roles } from '../../generated/prisma/client'
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Post('slot')
  createFromSlot(
    @Body()
    body: {
      resourceId: number;
      serviceId: number;
      date: string; // YYYY-MM-DD
      start: string; // HH:mm
      end: string // HH:mm
    },
  ) {
    return this.scheduleService.createFromSlot(body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('availability')
  getAffected(
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
    @Query('date') date: string,) {
    return this.scheduleService.getAffected(start_time, end_time, date,);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get()
  findAll() {
    return this.scheduleService.findAll();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.findOne(+id);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateScheduleDto: Prisma.schedule_overridesUpdateInput) {
    return this.scheduleService.update(+id, updateScheduleDto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.remove(+id);
  }
}
