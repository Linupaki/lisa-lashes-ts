import { Injectable } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}
  validateUser({this.db.users.phone}: AuthPayloadDto) {


  }
}
