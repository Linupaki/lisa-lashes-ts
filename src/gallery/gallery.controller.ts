import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SkipThrottle } from '@nestjs/throttler';

const galleryStorage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../../../front_admin/uploads/gallery'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `gallery-${unique}${extname(file.originalname)}`);
  },
});

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  // ── PUBLIC ────────────────────────────────────────────────────────────────
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get('public')
  listPublic() {
    return this.galleryService.listPublic();
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Get('admin')
  listAdmin() {
    return this.galleryService.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post('admin')
  @UseInterceptors(FileInterceptor('image', { storage: galleryStorage }))
  async create(@Body() body: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) return { success: false, message: 'An image is required.' };
    return this.galleryService.create({
      title: body.title,
      image_path: file.filename,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Put('admin/reorder')
  reorder(@Body() body: { ids: number[] }) {
    return this.galleryService.reorder(body.ids || []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Put('admin/:id')
  @UseInterceptors(FileInterceptor('image', { storage: galleryStorage }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.is_active !== undefined) data.is_active = body.is_active === 'true' || body.is_active === true;
    if (file) data.image_path = file.filename;

    return this.galleryService.update(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete('admin/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.remove(id);
  }
}
