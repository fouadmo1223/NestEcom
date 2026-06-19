import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
    @IsOptional() @IsString() fullName?: string;
    @IsOptional() @IsString() phone?: string;
    @IsOptional() @IsString() street?: string;
    @IsOptional() @IsString() city?: string;
    @IsOptional() @IsString() state?: string;
    @IsOptional() @IsString() postalCode?: string;
    @IsOptional() @IsString() country?: string;
    @IsOptional() @IsBoolean() isDefault?: boolean;
}
