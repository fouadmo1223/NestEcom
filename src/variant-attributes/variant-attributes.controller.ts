import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VariantAttributesService } from './variant-attributes.service';
import { UpsertVariantAttributeDto } from './dtos/upsert-variant-attribute.dto';
import { AddAttributeValueDto } from './dtos/add-value.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from '../users/user.entity';

type Caller = { id: number; userType: UserType };

@ApiTags('Variant attributes')
@ApiBearerAuth()
@Controller('variant-attributes')
@UseGuards(JwtGuard)
export class VariantAttributesController {
  constructor(private readonly service: VariantAttributesService) {}

  @Get()
  list(@CurrentUser() user: Caller) {
    // Super admin (owns no vendor) sees every value; a vendor is keyed by userId.
    const viewerId = user.userType === UserType.SUPER_ADMIN ? null : user.id;
    return this.service.findAllForViewer(viewerId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  create(@Body() dto: UpsertVariantAttributeDto, @CurrentUser() user: Caller) {
    return this.service.create(dto, user.id);
  }

  /** Vendors and staff may append a value to a shared attribute. */
  @Post(':id/values')
  @HttpCode(HttpStatus.OK)
  addValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddAttributeValueDto,
    @CurrentUser() user: Caller,
  ) {
    const ownerId = user.userType === UserType.SUPER_ADMIN ? null : user.id;
    return this.service.addValue(id, dto.value, dto.valueAr, ownerId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertVariantAttributeDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
