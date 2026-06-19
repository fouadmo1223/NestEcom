import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
    @IsString() @IsNotEmpty() fullName!: string;
    @IsString() @IsNotEmpty() phone!: string;
    @IsString() @IsNotEmpty() street!: string;
    @IsString() @IsNotEmpty() city!: string;
    @IsString() @IsNotEmpty() state!: string;
    @IsString() @IsNotEmpty() postalCode!: string;
    @IsOptional() @IsString() country?: string;
    @IsOptional() @IsBoolean() isDefault?: boolean;
}
