import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { booking_status } from '@prisma/client';

@Injectable()
export class CoursesBookingsService {
  constructor(private readonly db: DatabaseService) { }

  // POST — book a course
  async create(courseId: number, userId: number) {
    const course = await this.db.courses.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found.');
    if (!course.is_active) throw new BadRequestException('This course is not available.');

    // Check already booked
    const existing = await this.db.course_bookings.findUnique({
      where: { course_id_user_id: { course_id: courseId, user_id: userId } },
    });
    if (existing) throw new ConflictException('You have already booked this course.');

    // Check spots
    if (course.spots !== null) {
      const bookingCount = await this.db.course_bookings.count({
        where: { course_id: courseId, status: { not: booking_status.cancelled } },
      });
      if (bookingCount >= course.spots) {
        throw new BadRequestException('Sorry, this course is fully booked.');
      }
    }

    return this.db.course_bookings.create({
      data: { course_id: courseId, user_id: userId, status: booking_status.confirmed },
      include: { course: true },
    });
  }

  // GET user's course bookings
  async findByUser(userId: number) {
    return this.db.course_bookings.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        course: {
          select: {
            id: true, title: true, date: true, time_start: true,
            time_end: true, location: true, instructor: true,
            price: true, image_path: true,
          },
        },
      },
    });
  }

  // GET all bookings — admin
  async findAll() {
    return this.db.course_bookings.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        course: { select: { id: true, title: true, date: true, price: true } },
        user: { select: { id: true, first_name: true, last_name: true, phone: true } },
      },
    });
  }

  // GET spots remaining for a course
  async getSpotsLeft(courseId: number) {
    const course = await this.db.courses.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found.');
    if (course.spots === null) return { spots: null, booked: null, available: null };

    const booked = await this.db.course_bookings.count({
      where: { course_id: courseId, status: { not: booking_status.cancelled } },
    });
    return { spots: course.spots, booked, available: course.spots - booked };
  }

  // DELETE — cancel booking (admin or owner)
  async cancel(bookingId: number, userId: number, isAdmin: boolean) {
    const booking = await this.db.course_bookings.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (!isAdmin && booking.user_id !== userId) throw new BadRequestException('Not authorised.');

    return this.db.course_bookings.update({
      where: { id: bookingId },
      data: { status: booking_status.cancelled },
    });
  }
}
