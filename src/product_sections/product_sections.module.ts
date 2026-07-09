import { Module } from '@nestjs/common';
import { ProductSectionsController } from './product_sections.controller';
import { ProductSectionsService } from './product_sections.service';

@Module({
  controllers: [ProductSectionsController],
  providers: [ProductSectionsService],
})
export class ProductSectionsModule {}
