import { Controller, Get } from "@nestjs/common";


@Controller('users')
export class UsersController {
    @Get()
    getAll(){
        return [{id: 1, username: 'user1'}, {id: 2, username: 'user2'}, {id: 3, username: 'user3'}]
    }
}