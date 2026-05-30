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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/products', // Folder where images are saved on disk
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
      path: file ? `/uploads/products/${file.filename}` : null,
    };

    return this.productsService.create(createProductsDto);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Put() // Changed from @Patch(':id') to @Put() to match your frontend routing fetch
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  update(
    @Query('id') id: string, // Changed from @Param to @Query to read ?id=X
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updateProductsDto: Prisma.productsUpdateInput = {
      name: body.name,
      price: body.price,
      stock: body.stock ? parseInt(body.stock, 10) : undefined,
      description: body.description,
      category: body.category,
    };

    // Only update the image path if a new image file was actually uploaded
    if (file) {
      updateProductsDto.path = `/uploads/products/${file.filename}`;
    }

    return this.productsService.update(+id, updateProductsDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete() // Changed from @Delete(':id') to match fetch(`${ADMIN_API}/products?id=${id}`)
  remove(@Query('id') id: string) {
    return this.productsService.remove(+id);
  }

}
