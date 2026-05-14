import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';


@Module({
  imports: [
    ServeStaticModule.forRoot({
      // This is the absolute path to your folder containing index.html
      rootPath: join(__dirname, '../..', 'front'),

      // Optional: Requests starting with /public will look here
      // serveRoot: '/public',
      renderPath: '/',
    }),
    DatabaseModule,
    UserModule,
    AuthModule
  ], controllers: [AppController],
  providers: [AppService,],
})
export class AppModule { }
