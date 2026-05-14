import {Injectable, UnauthorizedException,} 
from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(identifier: string, password: string) {
    const user = await this.db.users.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { address: identifier },
        ],
      },
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      throw new UnauthorizedException(
        'Invalid phone/address or password',
      );
    }

    const payload = {
      sub: user.id,
      username: user.first_name,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        first_name: user.first_name,
        role: user.role,
      },
    };
  }
}