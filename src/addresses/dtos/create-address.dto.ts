import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
    @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
    @IsString() @IsNotEmpty() fullName!: string;

    @ApiProperty({ example: '1234567890', description: 'The phone number of the user' })
    @IsString() @IsNotEmpty() phone!: string;

    @ApiProperty({ example: '123 Main St', description: 'The street address' })
    @IsString() @IsNotEmpty() street!: string;

    @ApiProperty({ example: 'Anytown', description: 'The city' })
    @IsString() @IsNotEmpty() city!: string;

    @ApiProperty({ example: 'CA', description: 'The state or province' })
    @IsString() @IsNotEmpty() state!: string;

    @ApiProperty({ example: '12345', description: 'The postal code' })
    @IsString() @IsNotEmpty() postalCode!: string;

    @ApiProperty({ example: 'USA', description: 'The country', required: false })
    @IsOptional() @IsString() country?: string;

    @ApiProperty({ example: true, description: 'Whether this is the default address', required: false })
    @IsOptional() @IsBoolean() isDefault?: boolean;
}