import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Adjust paths as per your project structure
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '../../generated/prisma/client'; // Assuming user_roles comes from Prisma or an enum config

@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) { }

  // ==========================================
  // 1. WEEKLY BASE SCHEDULES (endpoint: /schedule)
  // ==========================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('schedule')
  async getWeeklySchedule(@Query('resource_id', ParseIntPipe) resourceId: number) {
    // Expected return JSON shape: { days: [ { weekday: 1, working: true, start: "09:00", end: "19:00" }, ... ] }
    return this.scheduleService.getWeeklySchedule(resourceId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Patch('schedule')
  async saveWeeklySchedule(
    @Query('resource_id', ParseIntPipe) resourceId: number,
    @Body() body: { days: Array<{ weekday: number; working: boolean; start: string; end: string }> }
  ) {
    return this.scheduleService.saveWeeklySchedule(resourceId, body.days);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('schedule-overrides')
  async getExceptions(
    @Query('resource_id', ParseIntPipe) resourceId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.scheduleService.getExceptions(resourceId, year, month);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Patch('schedule-overrides')
  async addOrUpdateException(
    @Query('resource_id', ParseIntPipe) resourceId: number,
    @Body() body: { date: string; working: boolean; start: string; end: string; note?: string }
  ) {
    return this.scheduleService.addOrUpdateException(resourceId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete('schedule-overrides')
  async removeException(
    @Query('resource_id', ParseIntPipe) resourceId: number,
    @Query('date') date: string,
  ) {
    return this.scheduleService.removeException(resourceId, date);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get('availability')
  getAffected(
    @Query('start_time') start_time: string,
    @Query('end_time') end_time: string,
    @Query('date') date: string,
  ) {
    return this.scheduleService.getAffected(start_time, end_time, date);
  }
}
