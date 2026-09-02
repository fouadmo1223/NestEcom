import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariantAttribute } from './variant-attribute.entity';
import { VariantAttributesService } from './variant-attributes.service';
import { VariantAttributesController } from './variant-attributes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([VariantAttribute]), AuthModule],
  controllers: [VariantAttributesController],
  providers: [VariantAttributesService],
})
export class VariantAttributesModule {}
