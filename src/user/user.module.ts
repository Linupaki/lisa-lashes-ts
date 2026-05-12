import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseService } from '../database/database.service';
@Module({
  imports: [DatabaseService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
