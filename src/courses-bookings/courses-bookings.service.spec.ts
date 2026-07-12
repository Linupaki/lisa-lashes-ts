import { Test, TestingModule } from '@nestjs/testing';
import { CoursesBookingsService } from './courses-bookings.service';

describe('CoursesBookingsService', () => {
  let service: CoursesBookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesBookingsService],
    }).compile();

    service = module.get<CoursesBookingsService>(CoursesBookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
