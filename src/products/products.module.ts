import { Module } from '@nestjs/common';
import { ProductImagesController } from './product_gallery.controller';
import { ProductImagesService } from './product_gallery.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';


@Module({
  controllers: [ProductsController, ProductImagesController],
  providers: [ProductsService, ProductImagesService]
})
export class ProductsModule { }
