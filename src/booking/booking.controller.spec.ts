import { Test, TestingModule } from '@nestjs/testing';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('BookingController', ()  => {
  let controller: BookingController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [BookingController],
      providers: [
        {
          provide: BookingService,
          useValue: {
            create: jest.fn(),
            getAvailability: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate: jest.fn().mockResolvedValue(true),
    });

    const module: TestingModule = await moduleBuilder.compile();

    controller = module.get<BookingController>(BookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
})
