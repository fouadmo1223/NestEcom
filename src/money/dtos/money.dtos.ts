import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';

export class RequestPayoutDto {
  @ApiProperty({ example: 250.0 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiProperty({ required: false, description: 'Bank account / wallet reference' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  method?: string;
}

export enum PayoutAdminAction {
  APPROVE = 'approve',
  PAY = 'pay',
  REJECT = 'reject',
}

export class ProcessPayoutDto {
  @ApiProperty({ enum: PayoutAdminAction })
  @IsEnum(PayoutAdminAction)
  action!: PayoutAdminAction;

  @ApiProperty({ required: false, description: 'Transfer reference (when paying)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class LedgerQueryDto extends PaginationDto {}

export class AdminPayoutQueryDto extends PaginationDto {
  @ApiProperty({ required: false, enum: ['requested', 'approved', 'paid', 'rejected'] })
  @IsOptional()
  @IsString()
  status?: string;
}
