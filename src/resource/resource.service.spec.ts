import { Test, TestingModule } from '@nestjs/testing';
import { ResourceService } from './resource.service';
import { DatabaseService } from '../database/database.service';

describe('ResourceService', () => {
  let service: ResourceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule ({
      providers: [
        ResourceService,
        {
          provide: DatabaseService,
          useValue: {
            resources: {},
          },
        },
      ],
    }).compile();

    service = module.get<ResourceService>(ResourceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
