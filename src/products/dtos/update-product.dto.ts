import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
    @IsOptional()
    @IsString({ message: 'Name must be a string' })
    name?: string;

    @IsOptional()
    @IsNumber({}, { message: 'Price must be a number' })
    @Min(0, { message: 'Price must be at least 0' })
    price?: number;
}
