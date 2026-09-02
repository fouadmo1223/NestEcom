import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class VariantAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  valueAr?: string;

  /** null / omitted = platform value; a user id = a vendor's private value. */
  @IsOptional()
  @IsInt()
  ownerId?: number | null;
}

export class UpsertVariantAttributeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeValueDto)
  values!: VariantAttributeValueDto[];
}
