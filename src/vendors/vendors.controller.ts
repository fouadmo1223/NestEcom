import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { imageMulterOptions } from '../uploads/multer.config';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApplyVendorDto, UpdateStoreDto, VendorListQueryDto } from './dtos/vendor.dtos';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  // ─── Authenticated: self ──────────────────────────────────────────────

  @Post('apply')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  apply(@CurrentUser() user: { id: number }, @Body() dto: ApplyVendorDto) {
    return this.vendorsService.apply(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  getMine(@CurrentUser() user: { id: number }) {
    return this.vendorsService.getMyVendor(user.id);
  }

  @Get('me/applications')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  myApplications(@CurrentUser() user: { id: number }) {
    return this.vendorsService.myApplications(user.id);
  }

  @Patch('me/store')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  updateMyStore(@CurrentUser() user: { id: number }, @Body() dto: UpdateStoreDto) {
    return this.vendorsService.updateMyStore(user.id, dto);
  }

  @Patch('me/store/image')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', imageMulterOptions))
  async uploadStoreImage(
    @CurrentUser() user: { id: number },
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind: string,
  ) {
    if (!file) throw new BadRequestException('No image uploaded');
    if (kind !== 'logo' && kind !== 'cover') {
      throw new BadRequestException('kind must be "logo" or "cover"');
    }
    const url = await this.cloudinary.uploadFile(file.buffer, 'stores');
    return this.vendorsService.updateMyStore(
      user.id,
      kind === 'logo' ? { logo: url } : { coverImage: url },
    );
  }

  // ─── Public storefront ────────────────────────────────────────────────

  @Get()
  list(@Query() query: VendorListQueryDto) {
    return this.vendorsService.listPublicVendors(query);
  }

  @Get(':slug')
  getBySlug(@Param('slug') slug: string) {
    return this.vendorsService.getPublicStore(slug);
  }
}
