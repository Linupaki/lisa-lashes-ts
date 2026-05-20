import { Test, TestingModule } from '@nestjs/testing';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

describe('ResourceController', ()  => {
  let controller: ResourceController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [ResourceController],
      providers: [
        {
          provide: ResourceService,
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

    controller = module.get<ResourceController>(ResourceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
})
