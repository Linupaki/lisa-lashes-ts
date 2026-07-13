import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { user_roles } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AboutSectionDto, AboutSectionsService } from './about.service';
import { diskStorage } from 'multer';
import { extname, join } from 'path';

@Controller('about')
export class AboutSectionsController {
  constructor(private readonly SectionsService: AboutSectionsService) { }

  @Get('public')
  findAllPublic() {
    return this.SectionsService.listPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Get('admin')
  findAllAdmin() {
    return this.SectionsService.listAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post('admin')
  createEmptyPlaceholder(@Body() dto?: AboutSectionDto) {
    return this.SectionsService.create(dto || {});
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Put('admin')
  updateAll(@Body() payload: { blocks: any[] }) {
    return this.SectionsService.saveBulk(payload.blocks || []);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete('admin')
  remove(@Query('id') id: string) {
    return this.SectionsService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Delete('admin/blocks/:id')
  removeBlock(@Param('id') id: string) {
    return this.SectionsService.remove(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post('blocks/:id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (req, file, callback) => {
          // Navigates securely out from standard NestJS runtime paths to front_admin base folders
          const uploadPath = join(__dirname, '../../../front_admin/uploads/about');
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `about-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async uploadBlockImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) return { success: false, message: 'No file uploaded' };

    const updatedBlock = await this.SectionsService.updateImageField(+id, file.filename);
    return { success: true, filename: file.filename, block: updatedBlock };
  }
}
