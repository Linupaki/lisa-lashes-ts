import { Module } from '@nestjs/common';
import { ReceiptController, AdminReceiptController } from './receipt.controller';
import { ReceiptService } from './receipt.service';

@Module({
  controllers: [ReceiptController, AdminReceiptController],
  providers: [ReceiptService],
  exports: [ReceiptService], // export for future email use
})
export class ReceiptModule { }

