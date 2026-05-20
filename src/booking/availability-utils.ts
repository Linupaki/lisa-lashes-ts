type WorkingHoursLike = {
  start_time: Date;
  end_time: Date;
};

type BookingLike = {
  start_time: Date;
  end_time: Date;
  status?: string | null;
};

export type GenerateAvailabilitySlotsInput = {
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  workingHours: WorkingHoursLike;
  bookings: BookingLike[];
  stepMinutes: number;
};

const MINUTES_TO_MS = 60_000;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatHHmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTES_TO_MS);
}

function getTimePartsFromPgTime(time: Date): { hours: number; minutes: number } {
  return { hours: time.getUTCHours(), minutes: time.getUTCMinutes() };
}

function dateAtLocalMidnight(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function dateWithTime(date: string, time: Date): Date {
  const base = dateAtLocalMidnight(date);
  const { hours, minutes } = getTimePartsFromPgTime(time);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function generateAvailabilitySlots(input: GenerateAvailabilitySlotsInput): string[] {
  const { date, durationMinutes, workingHours, bookings, stepMinutes } = input;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return [];
  }
  if (!Number.isFinite(stepMinutes) || stepMinutes <= 0) {
    return [];
  }

  const workingStart = dateWithTime(date, workingHours.start_time);
  const workingEnd = dateWithTime(date, workingHours.end_time);

  if (Number.isNaN(workingStart.getTime()) || Number.isNaN(workingEnd.getTime())) {
    return [];
  }

  if (workingEnd <= workingStart) {
    return [];
  }

  const activeBookings = bookings.filter((booking) => booking.status !== 'cancelled');

  const slots: string[] = [];
  for (
    let slotStart = workingStart;
    addMinutes(slotStart, durationMinutes) <= workingEnd;
    slotStart = addMinutes(slotStart, stepMinutes)
  ) {
    const slotEnd = addMinutes(slotStart, durationMinutes);

    const hasConflict = activeBookings.some((booking) =>
      overlaps(slotStart, slotEnd, booking.start_time, booking.end_time),
    );

    if (!hasConflict) {
      slots.push(formatHHmm(slotStart));
    }
  }

  return slots;
}
