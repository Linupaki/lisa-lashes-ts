import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DatabaseService } from '../database/database.service';
import { hashPassword } from '../password';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) { }

  async findAll() {
    return this.db.users.findMany();
  }

  async create(createUserDto: Prisma.usersCreateInput) {

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

  async update(id: number, updateUserDto: Prisma.usersUpdateInput) {
    return this.db.users.update({ where: { id }, data: updateUserDto });
  }

  async remove(id: number) {
    return this.db.users.delete({ where: { id } })
  }
}
