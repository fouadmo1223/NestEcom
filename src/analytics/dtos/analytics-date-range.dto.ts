import { IsDateString, IsOptional } from 'class-validator';

export class AnalyticsDateRangeDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
