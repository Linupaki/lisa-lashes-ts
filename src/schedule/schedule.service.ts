import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
//
// FULLY translated From cpp, Raw query were used because it needs less logic to be written
//

export interface WorkingDay {
  weekday: number;
  working: boolean;
  start: string;
  end: string;
}

export interface ScheduleOverride {
  date: string;
  working: boolean;
  start: string;
  end: string;
  note: string;
}

@Injectable()
export class ScheduleService {
  constructor(private readonly db: DatabaseService) { }

  private combineDateAndTime(dateStr: string, timeStr: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) {
      throw new BadRequestException(`Invalid date or time structure provided: ${dateStr} ${timeStr}`);
    }
    return new Date(`${dateStr}T${timeStr}:00Z`);
  }
  async getWeeklySchedule(resourceId: number) {
    try {

      const days: WorkingDay[] = Array.from({ length: 7 }, (_, i) => ({
        weekday: i,
        working: false,
        start: '09:00',
        end: '18:00',
      }));

      const records: any[] = await this.db.$queryRaw`
        SELECT 
          weekday, 
          to_char(start_time, 'HH24:MI') as start, 
          to_char(end_time, 'HH24:MI') as end 
        FROM working_hours 
        WHERE resource_id = ${resourceId} 
        ORDER BY weekday
      `;

      for (const row of records) {
        const wd = row.weekday;
        if (wd >= 0 && wd < 7) {
          days[wd].working = true;
          days[wd].start = row.start;
          days[wd].end = row.end;
        }
      }

      return { days };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to retrieve weekly schedule: ${error.message}`);
    }
  }

  async saveWeeklySchedule(resourceId: number, days: WorkingDay[]) {
    try {
      // Execute within a transaction to maintain atomicity across deletions and inserts
      await this.db.$transaction(async (tx) => {
        await tx.$executeRaw`
          DELETE FROM working_hours WHERE weekday = ${resourceId}
        `;

        for (const d of days) {
          if (!d.working) continue;

          await tx.$executeRaw`
            INSERT INTO working_hours (weekday, start_time, end_time)
            VALUES (${d.weekday}, ${d.start}::time, ${d.end}::time)
          `;
        }
      });

      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to save weekly schedule: ${error.message}`);
    }
  }



  async getExceptions(resourceId: number, year: number, month: number) {
    try {
      let records: any[];

      if (year > 0 && month > 0) {
        records = await this.db.$queryRaw`
          SELECT 
            to_char(date, 'YYYY-MM-DD') as date, 
            working, 
            COALESCE(to_char(start_time, 'HH24:MI'), '') as start, 
            COALESCE(to_char(end_time, 'HH24:MI'), '') as end, 
            COALESCE(note, '') as note
          FROM schedule_overrides 
          WHERE resource_id = ${resourceId} 
            AND EXTRACT(YEAR FROM date) = ${year} 
            AND EXTRACT(MONTH FROM date) = ${month} 
          ORDER BY date
        `;
      } else {
        records = await this.db.$queryRaw`
          SELECT 
            to_char(date, 'YYYY-MM-DD') as date, 
            working, 
            COALESCE(to_char(start_time, 'HH24:MI'), '') as start, 
            COALESCE(to_char(end_time, 'HH24:MI'), '') as end, 
            COALESCE(note, '') as note
          FROM schedule_overrides 
          WHERE resource_id = ${resourceId} 
          ORDER BY date
        `;
      }

      const overrides: ScheduleOverride[] = records.map((r) => ({
        date: r.date,
        working: r.working === true,
        start: r.start,
        end: r.end,
        note: r.note,
      }));

      return { overrides };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get overrides: ${error.message}`);
    }
  }

  async addOrUpdateException(
    resourceId: number,
    data: { date: string; working: boolean; start: string; end: string; note?: string }
  ) {
    try {
      const noteValue = data.note ?? '';
      await this.db.$executeRaw`
        INSERT INTO schedule_overrides (resource_id, date, working, start_time, end_time, note) 
        VALUES (
          ${resourceId}, 
          ${data.date}::date, 
          ${data.working}::boolean, 
          NULLIF(${data.start}, '')::time, 
          NULLIF(${data.end}, '')::time, 
          NULLIF(${noteValue}, '')
        ) 
        ON CONFLICT (resource_id, date) DO UPDATE SET 
          working    = EXCLUDED.working, 
          start_time = EXCLUDED.start_time, 
          end_time   = EXCLUDED.end_time, 
          note       = EXCLUDED.note
      `;

      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to update override exception: ${error.message}`);
    }
  }

  async removeException(resourceId: number, date: string) {
    try {
      await this.db.$executeRaw`
        DELETE FROM schedule_overrides 
        WHERE resource_id = ${resourceId} AND date = ${date}::date
      `;
      return { success: true };
    } catch (error) {
      throw new InternalServerErrorException(`Failed to remove override exception: ${error.message}`);
    }
  }
  async getEffectiveHours(resourceId: number, date: string, weekday: number) {
    try {
      // 1. Check specific-date override query
      const overrides: any[] = await this.db.$queryRaw`
        SELECT 
          working, 
          COALESCE(to_char(start_time, 'HH24:MI'), '') as start, 
          COALESCE(to_char(end_time, 'HH24:MI'), '') as end 
        FROM schedule_overrides 
        WHERE resource_id = ${resourceId} AND date = ${date}::date
      `;

      if (overrides.length > 0) {
        return {
          working: overrides[0].working === true,
          hours: {
            start: overrides[0].start,
            end: overrides[0].end,
          },
        };
      }

      // 2. Fall back to standard weekly baseline hours layout
      const weeklyHours: any[] = await this.db.$queryRaw`
        SELECT 
          to_char(start_time, 'HH24:MI') as start, 
          to_char(end_time, 'HH24:MI') as end 
        FROM working_hours 
        WHERE resource_id = ${resourceId} AND weekday = ${weekday}
      `;

      if (weeklyHours.length === 0) {
        return {
          working: false,
          hours: { start: '09:00', end: '18:00' },
        };
      }

      return {
        working: true,
        hours: {
          start: weeklyHours[0].start,
          end: weeklyHours[0].end,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(`Effective hours computation failure: ${error.message}`);
    }
  }
  // NEEDs to be connected to the front end
  async getAffected(dateStr: string, startStr?: string, endStr?: string) {
    try {
      if (startStr && endStr) {
        const newStart = new Date(`${dateStr}T${startStr}:00Z`);
        const newEnd = new Date(`${dateStr}T${endStr}:00Z`);

        return await this.db.bookings.findMany({
          where: {
            status: { notIn: ['cancelled'] },
            OR: [
              { start_time: { lt: newStart } },
              { end_time: { gt: newEnd } }
            ]
          },
          orderBy: { start_time: 'asc' },
        });
      }

      return [];
    } catch (error) {
      throw new Error(`Failed to calculate conflicts: ${error.message}`);
    }
  }
}
