import { Test, TestingModule } from '@nestjs/testing';
import { ProductSectionsService } from './product_sections.service';
import { ProductTypesService } from 'src/product_types/product_types.service';

describe('ProductSectionsService', () => {
  let service: ProductSectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductSectionsService],
    }).compile();

    service = module.get<ProductSectionsService>(ProductSectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
