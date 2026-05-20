import { Test, TestingModule } from '@nestjs/testing';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('ServiceController', () => {
  let controller: ServiceController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ServiceController],
      providers: [
        {
          provide: ServiceService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
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

    controller = module.get<ServiceController>(ServiceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
