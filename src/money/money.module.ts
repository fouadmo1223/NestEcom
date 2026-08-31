import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Payout } from './entities/payout.entity';
import { Vendor } from '../vendors/entities/vendor.entity';
import { VendorOrder } from '../orders/entities/vendor-order.entity';
import { LedgerService } from './ledger.service';
import { PayoutsService } from './payouts.service';
import { VendorMoneyController, AdminPayoutsController } from './money.controller';
import { AuthModule } from '../auth/auth.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntry, Payout, Vendor, VendorOrder]),
    AuthModule,
    VendorsModule,
  ],
  controllers: [VendorMoneyController, AdminPayoutsController],
  providers: [LedgerService, PayoutsService],
  exports: [LedgerService],
})
export class MoneyModule {}
