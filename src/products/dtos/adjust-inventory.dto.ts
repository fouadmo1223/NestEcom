import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';
import { InventoryReason } from '../entities/inventory-log.entity';

export class AdjustInventoryDto {
  @ApiProperty({ example: 25, description: 'Signed delta to apply to stock (non-zero)' })
  @Transform(({ value }) => Number(value))
  @IsInt({ message: 'Change must be an integer' })
  @NotEquals(0, { message: 'Change cannot be zero' })
  change!: number;

  @ApiProperty({ enum: InventoryReason, required: false })
  @IsOptional()
  @IsEnum(InventoryReason)
  reason?: InventoryReason;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
