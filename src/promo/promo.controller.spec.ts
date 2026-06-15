import { Test, TestingModule } from '@nestjs/testing';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('PromoController', () => {
  let controller: PromoController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [PromoController],
      providers: [
        {
          provide: PromoService,
          useValue: {
            findOneByCode: jest.fn(),
            createPromo: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<PromoController>(PromoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});