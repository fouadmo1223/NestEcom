import { Injectable, NotFoundException } from '@nestjs/common';

type User = { id: number; username: string };

@Injectable()
export class UsersService {
    private users: User[] = [
        { id: 1, username: 'user1' },
        { id: 2, username: 'user2' },
        { id: 3, username: 'user3' },
    ];

    findAll(): User[] {
        return this.users;
    }

    findOne(id: number): User {
        const user = this.users.find((u) => u.id === id);
        if (!user) throw new NotFoundException('User not found');
        return user;
    }
}
