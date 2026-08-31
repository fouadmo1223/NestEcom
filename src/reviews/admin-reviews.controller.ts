import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserType } from '../users/user.entity';
import { AdminReviewsQueryDto, ModerateReviewDto } from './dtos/moderation.dtos';

@ApiTags('Admin · Reviews')
@ApiBearerAuth()
@Controller('admin/reviews')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(@Query() query: AdminReviewsQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return this.reviews.findAll(page, limit, query.status);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  moderate(@Param('id', ParseIntPipe) id: number, @Body() dto: ModerateReviewDto) {
    return this.reviews.setStatus(id, dto.status);
  }
}
