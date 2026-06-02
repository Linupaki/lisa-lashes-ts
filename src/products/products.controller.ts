import { Controller, Get, Post, Body, Patch, Put, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Prisma, user_roles } from '../../generated/prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('shop')
  findActiveProducts() {
    return this.productsService.findActiveProducts();
  }

  @Get('slider')
  findSliderProducts() {
    return this.productsService.findSliderProducts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) { // Read as string first to safely format
    return this.productsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './front_admin/uploads/products', // Folder where images are saved on disk
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  create(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {

    const createProductsDto: Prisma.productsCreateInput = {
      name: body.name,
      price: body.price,
      stock: body.stock ? parseInt(body.stock, 10) : 0,
      description: body.description,
      category: body.category,
      path: file ? `${file.filename}` : null,

    };
    createProductsDto.is_active = body.is_active === true || body.is_active === 'true';
    createProductsDto.in_slider = body.in_slider === true || body.in_slider === 'true';
    return this.productsService.create(createProductsDto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Put()
  @UseInterceptors(
    FileInterceptor('image', {
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
  update(
    @Query('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const updateProductsDto: Prisma.productsUpdateInput = {
      name: body.name,
      price: body.price,
      stock: body.stock ? parseInt(body.stock, 10) : undefined,
      description: body.description,
      category: body.category,
    };
    if (body.is_active !== undefined) {
      updateProductsDto.is_active = body.is_active === true || body.is_active === 'true';
    }
    if (body.in_slider !== undefined) {
      updateProductsDto.in_slider = body.in_slider === true || body.in_slider === 'true';
    }
    // Only update the image identifier if a new image file was actually uploaded
    if (file) {
      updateProductsDto.path = `${file.filename}`;
    }
    return this.productsService.update(+id, updateProductsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete()
  remove(@Query('id') id: string) {
    return this.productsService.remove(+id);
  }

}
