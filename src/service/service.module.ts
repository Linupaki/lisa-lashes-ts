import { Module } from '@nestjs/common';
import { ServiceService} from './service.service';
import { ServiceController } from './service.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule { }
