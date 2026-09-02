import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
    @ApiProperty({ example: 'Home Appliances', description: 'The new name of the category' })
    @IsString({ message: 'Name must be a string' })
    @IsNotEmpty({ message: 'Name is required' })
    name!: string;

    @ApiProperty({ example: 'أجهزة منزلية', description: 'Arabic name', required: false })
    @IsOptional()
    @IsString({ message: 'Arabic name must be a string' })
    nameAr?: string;
}
