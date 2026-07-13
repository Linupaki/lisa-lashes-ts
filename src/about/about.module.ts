import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AboutSectionsController } from './about.controller';
import { AboutSectionsService } from './about.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AboutSectionsController],
  providers: [AboutSectionsService],
  exports: [AboutSectionsService],
})
export class AboutModule { }
