import { Controller, Get, Post, Delete, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { CoursesBookingsService } from './courses-bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';

// ── USER ──────────────────────────────────────────────────────────────────────

@Controller('course-bookings')
@UseGuards(JwtAuthGuard)
export class CoursesBookingsController {
  constructor(private readonly courseBookingsService: CoursesBookingsService) { }

  // GET /course-bookings — my bookings
  @Get()
  findMine(@Req() req: any) {
    return this.courseBookingsService.findByUser(req.user.sub);
  }

  // POST /course-bookings/:courseId — book a course
  @Post(':courseId')
  book(@Param('courseId', ParseIntPipe) courseId: number, @Req() req: any) {
    return this.courseBookingsService.create(courseId, req.user.sub);
  }

  // DELETE /course-bookings/:id/cancel — cancel my booking
  @Delete(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.courseBookingsService.cancel(id, req.user.sub, false);
  }
}

// ── PUBLIC — spots check ───────────────────────────────────────────────────────

@Controller('courses')
export class CourseSpotsController {
  constructor(private readonly courseBookingsService: CoursesBookingsService) { }

  @Get(':id/spots')
  getSpotsLeft(@Param('id', ParseIntPipe) id: number) {
    return this.courseBookingsService.getSpotsLeft(id);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

@Controller('admin/course-bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class AdminCourseBookingsController {
  constructor(private readonly courseBookingsService: CoursesBookingsService) { }

  @Get()
  findAll() {
    return this.courseBookingsService.findAll();
  }

  @Delete(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.courseBookingsService.cancel(id, req.user.sub, true);
  }
}
