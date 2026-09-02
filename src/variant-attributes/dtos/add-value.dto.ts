import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AddAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsOptional()
  @IsString()
  valueAr?: string;
}
