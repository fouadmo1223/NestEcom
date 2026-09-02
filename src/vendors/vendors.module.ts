import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vendor } from './entities/vendor.entity';
import { Store } from './entities/store.entity';
import { VendorApplication } from './entities/vendor-application.entity';
import { User } from '../users/user.entity';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { VendorGuard } from './vendor.guard';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, Store, VendorApplication, User]),
    AuthModule,
    MailModule,
    CloudinaryModule,
  ],
  controllers: [VendorsController, AdminVendorsController],
  providers: [VendorsService, VendorGuard],
  exports: [VendorsService, VendorGuard, TypeOrmModule],
})
export class VendorsModule {}
