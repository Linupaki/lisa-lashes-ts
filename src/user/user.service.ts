import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { hashPassword } from 'src/password';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) { }
  async create(createUserDto: Prisma.usersCreateInput) {
    // 1. Destructure the DTO to extract the plain-text password
    const { password_hash, ...restOfUserData } = createUserDto;


    const encryptedPassword = await hashPassword(password_hash);

    return this.db.users.create({
      data: {
        ...restOfUserData,
        password_hash: encryptedPassword,
        // Fallback to ensure every standard registration defaults to 'user' role
        role: createUserDto.role || 'user',
      },
    });
  }
  async findAll() {
    return this.db.users.findMany();
  }
  async login() {

  }
  async findOne(id: number) {
    return this.db.users.findUnique({ where: { id } });
  }

  async update(id: number, updateUserDto: Prisma.usersUpdateInput) {
    return this.db.users.update({ where: { id }, data: updateUserDto });
  }

  async remove(id: number) {
    return this.db.users.delete({ where: { id } })
  }
}
