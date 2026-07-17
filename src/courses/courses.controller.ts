import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, ParseIntPipe } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SkipThrottle } from '@nestjs/throttler';

const courseImageStorage = diskStorage({
  destination: './front_admin/uploads/courses',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`);
  },
});

// ── PUBLIC ────────────────────────────────────────────────────────────────────

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) { }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get()
  findAll() {
    return this.coursesService.findAll(false);
  }
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000)
  @SkipThrottle()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get()
  findAllAdmin() {
    return this.coursesService.findAll(true);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Post()
  @UseInterceptors(FileInterceptor('image', { storage: courseImageStorage }))
  async create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
    if (file) body.image_path = file.filename;
    return this.coursesService.create(body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Put(':id')
  @UseInterceptors(FileInterceptor('image', { storage: courseImageStorage }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) body.image_path = file.filename;
    return this.coursesService.update(id, body);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
