import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductImagesService } from './product_gallery.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';

@Controller('product-images')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin, user_roles.master)
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) { }

  // POST /product-images/:productId
  // Accepts up to 10 gallery images at once under the field name "gallery"
  @Post(':productId')
  @UseInterceptors(
    FilesInterceptor('gallery', 10, {
      storage: diskStorage({
        destination: './front_admin/uploads/products',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  addImages(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.productImagesService.addImages(+productId, files);
  }

  // DELETE /product-images/:imageId
  @Delete(':imageId')
  removeImage(@Param('imageId') imageId: string) {
    return this.productImagesService.removeImage(+imageId);
  }
}

