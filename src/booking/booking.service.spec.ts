import { Test, TestingModule } from '@nestjs/testing';
import { BookingService } from './booking.service';
import { DatabaseService } from '../database/database.service';
import { BookingSlotService } from './booking-slot.service';

describe('BookingService', () => {
  let service: BookingService;
  let db: {
    salon_services: { findUnique: jest.Mock };
    schedule_overrides: { findFirst: jest.Mock };
    working_hours: { findFirst: jest.Mock };
    bookings: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      salon_services: {
        findUnique: jest.fn(),
      },
      schedule_overrides: {
        findFirst: jest.fn(),
      },
      working_hours: {
        findFirst: jest.fn(),
      },
      bookings: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule ({
      providers: [
        BookingService,
        {
          provide: BookingSlotService,
          useValue: {
            createFromSlot: jest.fn(),
          },
        },
        {
          provide: DatabaseService,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns available slots excluding booking conflicts', async () => {
    db.salon_services.findUnique.mockResolvedValue({
      id: 1,
      duration_minutes: 60,
    });
    db.schedule_overrides.findFirst.mockResolvedValue(null);
    db.working_hours.findFirst.mockResolvedValue({
      start_time: new Date('1970-01-01T09:00:00.000Z'),
      end_time: new Date('1970-01-01T18:00:00.000Z'),
    });
    db.bookings.findMany.mockResolvedValue([
      {
        start_time: new Date('2026-05-20T11:00:00'),
        end_time: new Date('2026-05-20T12:30:00'),
        status: 'confirmed',
      },
    ]);

    const slots = await service.getAvailability(1, 1, '2026-05-20');

    expect(slots).toContain('09:00');
    expect(slots).toContain('10:00');
    expect(slots).toContain('12:30');

    expect(slots).not.toContain('10:30');
    expect(slots).not.toContain('11:00');
    expect(slots).not.toContain('11:30');
    expect(slots).not.toContain('12:00');
  });

  it('ignores cancelled bookings when generating slots', async () => {
    db.salon_services.findUnique.mockResolvedValue({
      id: 1,
      duration_minutes: 60,
    });
    db.schedule_overrides.findFirst.mockResolvedValue(null);
    db.working_hours.findFirst.mockResolvedValue({
      start_time: new Date('1970-01-01T09:00:00.000Z'),
      end_time: new Date('1970-01-01T10:00:00.000Z'),
    });
    db.bookings.findMany.mockResolvedValue([
      {
        start_time: new Date('2026-05-20T09:00:00'),
        end_time: new Date('2026-05-20T10:00:00'),
        status: 'cancelled',
      },
    ]);

    const slots = await service.getAvailability(1, 1, '2026-05-20');
    expect(slots).toEqual(['09:00']);
  });

  it('returns empty array when no working hours for weekday', async () => {
    db.salon_services.findUnique.mockResolvedValue({
      id: 1,
      duration_minutes: 60,
    });
    db.schedule_overrides.findFirst.mockResolvedValue(null);
    db.working_hours.findFirst.mockResolvedValue(null);

    const slots = await service.getAvailability(1, 1, '2026-05-20');
    expect(slots).toEqual([]);
  });

  it('returns empty array when schedule override marks day as non-working', async () => {
    db.salon_services.findUnique.mockResolvedValue({
      id: 1,
      duration_minutes: 60,
    });
    db.schedule_overrides.findFirst.mockResolvedValue({
      working: false,
      start_time: null,
      end_time: null,
    });

    const slots = await service.getAvailability(1, 1, '2026-05-20');
    expect(slots).toEqual([]);
    expect(db.working_hours.findFirst).not.toHaveBeenCalled();
  });

  it('uses schedule override working hours when provided', async () => {
    db.salon_services.findUnique.mockResolvedValue({
      id: 1,
      duration_minutes: 60,
    });
    db.schedule_overrides.findFirst.mockResolvedValue({
      working: true,
      start_time: new Date('1970-01-01T10:00:00.000Z'),
      end_time: new Date('1970-01-01T11:00:00.000Z'),
    });
    db.bookings.findMany.mockResolvedValue([]);

    const slots = await service.getAvailability(1, 1, '2026-05-20');
    expect(slots).toEqual(['10:00']);
    expect(db.working_hours.findFirst).not.toHaveBeenCalled();
  });
});
