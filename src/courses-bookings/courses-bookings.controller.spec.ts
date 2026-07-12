import { Test, TestingModule } from '@nestjs/testing';
import { CoursesBookingsController } from './courses-bookings.controller';
import { CoursesBookingsService } from './courses-bookings.service';

describe('CoursesBookingsController', () => {
  let controller: CoursesBookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesBookingsController],
      providers: [CoursesBookingsService],
    }).compile();

    controller = module.get<CoursesBookingsController>(CoursesBookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
