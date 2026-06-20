import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Address } from './address.entity';

@ApiTags('Addresses')
@ApiBearerAuth()
@Controller('addresses')
@UseGuards(JwtGuard)
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) {}

    @Get()
    @ApiOperation({ 
        summary: 'Get all addresses', 
        description: 'Retrieves all addresses for the authenticated user' 
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Returns all user addresses',
        type: [CreateAddressDto] // or your response DTO
    })
    @ApiResponse({ status: 401, description: 'Unauthorized - JWT token missing or invalid' })
    getAll(@CurrentUser() user: { id: number }) {
        return this.addressesService.findAll(user.id);
    }

    @Get(':id')
    @ApiOperation({ 
        summary: 'Get address by ID', 
        description: 'Retrieves a specific address by ID for the authenticated user' 
    })
    @ApiParam({ 
        name: 'id', 
        type: Number, 
        description: 'Address ID',
        example: 1
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Returns the address',
        type: Address
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Address not found' })
    getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
        return this.addressesService.findOne(id, user.id);
    }

    @Post()
    @ApiOperation({ 
        summary: 'Create new address', 
        description: 'Creates a new address for the authenticated user' 
    })
    @ApiBody({ 
        type: CreateAddressDto,
        description: 'Address creation data'
    })
    @ApiResponse({ 
        status: 201, 
        description: 'Address created successfully',
        type: Address
    })
    @ApiResponse({ status: 400, description: 'Validation error - Invalid data provided' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    create(@CurrentUser() user: { id: number }, @Body() dto: CreateAddressDto) {
        return this.addressesService.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ 
        summary: 'Update address', 
        description: 'Updates an existing address by ID for the authenticated user' 
    })
    @ApiParam({ 
        name: 'id', 
        type: Number, 
        description: 'Address ID to update',
        example: 1
    })
    @ApiBody({ 
        type: UpdateAddressDto,
        description: 'Address update data (partial updates allowed)'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Address updated successfully',
        type: Address
    })
    @ApiResponse({ status: 400, description: 'Validation error' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Address not found' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: { id: number },
        @Body() dto: UpdateAddressDto,
    ) {
        return this.addressesService.update(id, user.id, dto);
    }

    @Delete(':id')
    @ApiOperation({ 
        summary: 'Delete address', 
        description: 'Deletes an address by ID for the authenticated user' 
    })
    @ApiParam({ 
        name: 'id', 
        type: Number, 
        description: 'Address ID to delete',
        example: 1
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Address deleted successfully'
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Address not found' })
    remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { id: number }) {
        return this.addressesService.remove(id, user.id);
    }
}