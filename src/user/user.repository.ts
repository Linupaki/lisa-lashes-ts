import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { hashPassword, verifyPassword } from './password';
import { Enumerable } from 'generated/prisma/internal/prismaNamespace';

export type UserInfo = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  is_admin: Enumerable<string>;
};

@Injectable()
export class UserRepository {
  constructor(private readonly db: DatabaseService) {}

  async registerUser(user: {
    first: string;
    last: string;
    phone: string;
    email?: string;
    password: string;
  }) {
    try {
      const passwordHash = await hashPassword(user.password);
      const created = await this.db.user.create({
        data: {
          firstName: user.first,
          lastName: user.last,
          phone: user.phone,
          email: user.email ?? '',
          passwordHash,
        },
        select: { id: true },
      });
      return created.id;
    } catch {
      return null;
    }
  }

  async loginUser(identifier: string, password: string) {
    const user = await this.db.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
      },
      select: { id: true, passwordHash: true },
    });

    if (!user) return null;
    const ok = await verifyPassword(password, user.passwordHash);
    return ok ? user.id : null;
  }

  async removeUser(id: number) {
    try {
      await this.db.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async isAdmin(userId: number) {
    const res = await this.db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return res?.role === 'ADMIN' || res?.role === 'MASTER';
  }

  getAllUsers() {
    return this.getUsersInfo();
  }

  async getUserInfoById(id: number) {
    const row = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (!row) return null;
    return {
      id: row.id,
      first_name: row.firstName,
      last_name: row.lastName,
      phone: row.phone,
      email: row.email ?? '',
      is_admin: row.role === 'ADMIN' || row.role === 'MASTER',
    };
  }

  getUsersInfo(email?: string) {
    return this.db.user
      .findMany({
        where: email ? { email } : undefined,
        orderBy: { id: 'asc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          role: true,
        },
      })
      .then((rows) =>
        rows.map((u) => ({
          id: u.id,
          first_name: u.firstName,
          last_name: u.lastName,
          phone: u.phone,
          email: u.email ?? '',
          is_admin: u.role === 'ADMIN' || u.role === 'MASTER',
        })),
      );
  }

  async updateUser(
    id: number,
    obj: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const data: Prisma.UserUpdateInput = {};
   
    if (obj.first_name)
      data.firstName = obj.first_name;

    if (obj.last_name)
      data.lastName = obj.last_name;

    if (obj.phone)
      data.phone = obj.phone;

    if (obj.email)
      data.email = obj.email;

    await this.db.user.update({
      where: { id },
      data,
      select: { id: true },
    });
  }
}
