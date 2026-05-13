import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) { }
  async create(createUserDto: Prisma.usersCreateInput) {
    return this.db.users.create({ data: createUserDto });
  }

  async findAll() {
  }
  async login() {

  }
  async findOne(id: number) {
  }

  async update(id: number, updateUserDto: Prisma.usersUpdateInput) {
    return this.db.users.update({ where: { id }, data: updateUserDto });
  }

  async remove(id: number) {
    return this.db.users.delete({ where: { id } })
  }
}
