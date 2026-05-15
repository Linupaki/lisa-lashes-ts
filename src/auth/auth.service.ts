import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { verifyPassword } from 'src/password';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) { }

  async signIn(identifier: string, password: string) {
    // 1. Query the 'users' table matching either phone or email
    const user = await this.db.users.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { address: identifier }, // Fully fixed from 'address'
        ],
      },
    });

    // 2. Fail early if the account doesn't exist
    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    // 3. Verify the plain-text password against the database hash
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // 4. Construct the JWT payload using your database Enum role
    const payload = {
      sub: user.id,
      username: user.first_name,
      role: user.role, // This will cleanly output 'user', 'admin', or 'master'
    };

    // 5. Return the payload token along with user meta-data
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
