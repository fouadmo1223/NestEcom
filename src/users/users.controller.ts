import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from './user.entity';
import { UpdateUserDto } from './dtos/update-user.dto';
import { PaginationDto } from '../common/dtos/pagination.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @Roles(UserType.SUPER_ADMIN)
    @UseGuards(JwtGuard, RolesGuard)
    getAll(@Query() { page, limit }: PaginationDto) {
        const p = Math.max(1, Number(page) || 1);
        const l = Math.min(100, Math.max(1, Number(limit) || 10));
        return this.usersService.findAll(p, l);
    }

    @Get('me')
    @UseGuards(JwtGuard)
    getMe(@CurrentUser() user: { id: number }) {
        return this.usersService.getCurrentUser(user.id);
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtGuard)
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
        @CurrentUser() currentUser: { id: number; userType: UserType },
    ) {
        return this.usersService.update(id, dto, currentUser);
    }

    @Delete(':id')
    @UseGuards(JwtGuard)
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: { id: number; userType: UserType },
    ) {
        return this.usersService.delete(id, currentUser);
    }
}
