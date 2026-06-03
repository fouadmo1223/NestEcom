import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
    @IsString({ message: 'Name must be a string' })
    @IsNotEmpty({ message: 'Name is required' })
    name!: string;

    @IsNumber({}, { message: 'Price must be a number' })
    @Min(0, { message: 'Price must be at least 0' })
    price!: number;
}
