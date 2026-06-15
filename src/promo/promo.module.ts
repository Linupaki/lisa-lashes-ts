import { Module } from '@nestjs/common';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
<<<<<<< Updated upstream
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
=======

@Module({
>>>>>>> Stashed changes
  controllers: [PromoController],
  providers: [PromoService],
})
export class PromoModule {}
