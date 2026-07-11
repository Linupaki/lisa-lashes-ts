import { Module } from '@nestjs/common';
import { ProductImagesController } from './product_gallery.controller';
import { ProductImagesService } from './product_gallery.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_THIS',
  })],
  controllers: [ProductsController, ProductImagesController],
  providers: [ProductsService, ProductImagesService]
})
export class ProductsModule { }
