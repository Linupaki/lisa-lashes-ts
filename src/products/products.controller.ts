import { Controller, Get, Post, Body, Patch, Put, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Query, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Prisma, user_roles } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JwtService } from '@nestjs/jwt';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SkipThrottle } from '@nestjs/throttler';
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly jwtService: JwtService,
  ) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin, user_roles.master)
  @Get()
  findAll() {
    return this.productsService.findAll();
  }
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get('shop')
  findActiveProducts() {
    return this.productsService.findActiveProducts();
  }
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get('slider')
  findSliderProducts() {
    return this.productsService.findSliderProducts();
  }
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get('public/:id')
  findOnePublic(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  // Public — active products visible to all, draft/hidden only to admin/master
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @SkipThrottle()
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    let isAdmin = false;
    try {
      const token = req.cookies?.token;
      if (token) {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_THIS',
        });
        isAdmin = payload?.role === 'admin' || payload?.role === 'master';
      }
    } catch { isAdmin = false; }
    return this.productsService.findOnePublic(+id, isAdmin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Post()
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
  create(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = {
      name: body.name,
      price: body.price,
      stock: body.stock ? parseInt(body.stock, 10) : 0,
      description: body.description || null,
      category: body.category,
      path: file ? file.filename : null,
      status: 'draft',
      in_slider: body.in_slider === true || body.in_slider === 'true',
      product_type_id: body.product_type_id || null,
    };
    return this.productsService.create(data);
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
    const data: any = {
      name: body.name,
      price: body.price,
      stock: body.stock ? parseInt(body.stock, 10) : undefined,
      description: body.description,
      category: body.category,
    };

    if (body.status !== undefined) {
      data.status = body.status;
    }
    else { data.status = 'draft' }
    if (body.in_slider !== undefined) {
      data.in_slider = body.in_slider === true || body.in_slider === 'true';
    }

    // Pass product_type_id through — empty string will be treated as null (unassign) in the service
    if (body.product_type_id !== undefined) {
      data.product_type_id = body.product_type_id;
    }

    // Only update the path if a new file was uploaded, otherwise preserve the existing one from body
    if (file) {
      data.path = file.filename;
    } else if (body.path !== undefined) {
      data.path = body.path;
    }

    return this.productsService.update(+id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_roles.admin)
  @Delete()
  remove(@Query('id') id: string) {
    return this.productsService.remove(+id);
  }
}
