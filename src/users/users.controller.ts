import { Controller, Delete, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserType } from './user.entity';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    @Roles(UserType.SUPER_ADMIN)
    @UseGuards(JwtGuard, RolesGuard)
    getAll() {
        return this.usersService.findAll();
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

    @Delete(':id')
    @UseGuards(JwtGuard)
    delete(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() currentUser: { id: number; userType: UserType },
    ) {
        return this.usersService.delete(id, currentUser);
    }
}
