import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './user.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

type AuthResponse = {
    accessToken: string;
    refreshToken: string;
    user: Omit<User, 'password'>;
};

type RefreshResponse = {
    accessToken: string;
    refreshToken: string;
};

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    async findAll(page: number, limit: number) {
        const [data, total] = await this.usersRepository.findAndCount({
            select: { id: true, username: true, email: true, userType: true, isAccountVerified: true, createdAt: true, updatedAt: true },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, pagination: { total, page, limit } };
    }

    async findOne(id: number): Promise<Omit<User, 'password'>> {
        const user = await this.usersRepository.findOne({
            where: { id },
            select: { id: true, username: true, email: true, userType: true, isAccountVerified: true, createdAt: true, updatedAt: true },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    private async findOneWithPassword(id: number): Promise<User> {
        const user = await this.usersRepository.findOneBy({ id });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async register(dto: RegisterDto): Promise<User> {
        const existing = await this.usersRepository.findOneBy({ email: dto.email });
        if (existing) throw new BadRequestException('Email already in use');

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = this.usersRepository.create({ ...dto, password: hashedPassword });
        return this.usersRepository.save(user);
    }

    async login(dto: LoginDto): Promise<AuthResponse> {
        const user = await this.usersRepository.findOneBy({ email: dto.email });
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

        const payload = { id: user.id, email: user.email, userType: user.userType };
        const { password: _, ...userWithoutPassword } = user;

        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
            user: userWithoutPassword,
        };
    }

    async update(id: number, dto: UpdateUserDto, currentUser: { id: number; userType: UserType }): Promise<Omit<User, 'password'>> {
        const user = await this.findOneWithPassword(id);

        if (currentUser.userType !== UserType.SUPER_ADMIN && currentUser.id !== id) {
            throw new ForbiddenException('Access denied');
        }

        if (dto.password) {
            dto.password = await bcrypt.hash(dto.password, 10);
        }

        Object.assign(user, dto);
        await this.usersRepository.save(user);
        return this.getCurrentUser(id);
    }

    async delete(id: number, currentUser: { id: number; userType: UserType }): Promise<User> {
        const user = await this.findOneWithPassword(id);

        if (currentUser.userType !== UserType.SUPER_ADMIN && currentUser.id !== id) {
            throw new ForbiddenException('Access denied');
        }

        return this.usersRepository.remove(user);
    }

    async getCurrentUser(id: number): Promise<Omit<User, 'password'>> {
        const user = await this.usersRepository.findOne({
            where: { id }
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async refreshTokens(refreshToken: string): Promise<RefreshResponse> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const newPayload = { id: payload.id, email: payload.email, userType: payload.userType };
            return {
                accessToken: this.generateAccessToken(newPayload),
                refreshToken: this.generateRefreshToken(newPayload),
            };
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    private generateAccessToken(payload: object): string {
        return this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m') as any,
        });
    }

    private generateRefreshToken(payload: object): string {
        return this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') as any,
        });
    }
}
