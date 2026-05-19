import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BookingService {
  constructor(private readonly db: DatabaseService) { }
  async create(createBookingDto: Prisma.bookingsCreateInput, userId: number) {

    return this.db.bookings.create({
      data: {
        ...createBookingDto,
        
        users: {
          connect: {
            id: userId
          }
        }
      }
    })

  }
  
  async findAll() {
    return this.db.bookings.findMany();
  }

  async findOne(id: number) {
    return this.db.bookings.findUnique({ where: { id } });
  }

  async update(id: number, updateBookingDto: Prisma.bookingsUpdateInput) {
    return this.db.bookings.update({ where: { id }, data: updateBookingDto });
  }

  async remove(id: number) {
    return this.db.bookings.delete({ where: { id } })
  }
}
