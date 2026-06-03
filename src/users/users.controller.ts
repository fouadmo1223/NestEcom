import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    getAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    getOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }
}
