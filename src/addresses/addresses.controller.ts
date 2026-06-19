import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('addresses')
@UseGuards(JwtGuard)
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) {}

    @Get()
    getAll(@CurrentUser() user: { id: number }) {
        return this.addressesService.findAll(user.id);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
        return this.addressesService.findOne(id, user.id);
    }

    @Post()
    create(@CurrentUser() user: { id: number }, @Body() dto: CreateAddressDto) {
        return this.addressesService.create(user.id, dto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
        @Body() dto: UpdateAddressDto,
    ) {
        return this.addressesService.update(id, user.id, dto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
        return this.addressesService.remove(id, user.id);
    }
}
