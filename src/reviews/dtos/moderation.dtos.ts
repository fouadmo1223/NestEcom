import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { ReviewStatus } from '../review.entity';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Thanks for the feedback — glad it worked out!' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  text!: string;
}

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus })
  @IsEnum(ReviewStatus)
  status!: ReviewStatus;
}

export class AdminReviewsQueryDto extends PaginationDto {
  @ApiProperty({ required: false, enum: ['published', 'hidden'] })
  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;

  @ApiProperty({ required: false, description: 'Search by product title, reviewer username or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['newest', 'oldest'] })
  @IsOptional()
  @IsEnum({ newest: 'newest', oldest: 'oldest' })
  sort?: 'newest' | 'oldest';
}
