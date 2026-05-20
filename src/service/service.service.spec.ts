import { Test, TestingModule } from '@nestjs/testing';
import { ServiceService } from './service.service';
import { DatabaseService } from '../database/database.service';

describe('ServiceService', () => {
  let service: ServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule ({
      providers: [
        ServiceService,
        {
          provide: DatabaseService,
          useValue: {
            salon_services: {},
          },
        },
      ],
    }).compile();

    service = module.get<ServiceService>(ServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
