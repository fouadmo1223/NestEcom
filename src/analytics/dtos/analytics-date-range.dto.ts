import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AnalyticsDateRangeDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}

/** Date range + a `limit` (used by ranked list endpoints). */
export class RankedRangeDto extends AnalyticsDateRangeDto {
    @IsOptional()
    @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;
}
