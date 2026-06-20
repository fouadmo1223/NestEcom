import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
    @ApiProperty({ example: 'John Doe', description: 'The full name of the user', required: false })
    @IsOptional() @IsString() fullName?: string;

    @ApiProperty({ example: '1234567890', description: 'The phone number of the user', required: false })
    @IsOptional() @IsString() phone?: string;

    @ApiProperty({ example: '123 Main St', description: 'The street address', required: false })
    @IsOptional() @IsString() street?: string;

    @ApiProperty({ example: 'Anytown', description: 'The city', required: false })
    @IsOptional() @IsString() city?: string;

    @ApiProperty({ example: 'CA', description: 'The state or province', required: false })
    @IsOptional() @IsString() state?: string;

    @ApiProperty({ example: '12345', description: 'The postal code', required: false })
    @IsOptional() @IsString() postalCode?: string;

    @ApiProperty({ example: 'USA', description: 'The country', required: false })
    @IsOptional() @IsString() country?: string;

    @ApiProperty({ example: true, description: 'Whether this is the default address', required: false })
    @IsOptional() @IsBoolean() isDefault?: boolean;
}