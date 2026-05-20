import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module'; // Ensure database is imported
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true, // Makes JwtService available everywhere in the app
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_THIS',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, JwtAuthGuard, RolesGuard], // Register the guard here
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard], // Export it if other modules need to use it
})
export class AuthModule { }
