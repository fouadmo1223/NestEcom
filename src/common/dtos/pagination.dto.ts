import { IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty, ApiTags } from '@nestjs/swagger';

@ApiTags('Common')
export class PaginationDto {
    @ApiProperty({ example: '1', description: 'Page number for pagination', required: false })
    @IsOptional()
    @IsNumberString()
    page?: string;

    @ApiProperty({ example: '10', description: 'Number of items per page', required: false })
    @IsOptional()
    @IsNumberString()
    limit?: string;
}