import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DatabaseModule } from '../database/database.module';
import { UserRepository } from './user.repository';
import { AuthController } from '../auth/auth.controller';
import { SessionRepository } from '../auth/session.repository';
import { FormAuthController } from '../auth/form-auth.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController, AuthController, FormAuthController],
  providers: [UserService, UserRepository, SessionRepository],
})
export class UserModule { }


