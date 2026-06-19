import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './user.entity';
import { Otp, OtpType } from './otp.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { MailService } from '../mail/mail.service';

const OTP_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes
const OTP_EXPIRY_MS = 10 * 60 * 1000;    // 10 minutes

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
        @InjectRepository(Otp)
        private readonly otpRepository: Repository<Otp>,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) {}

    async findAll(page: number, limit: number) {
        const [data, total] = await this.usersRepository.findAndCount({
            select: { id: true, username: true, email: true, userType: true, isAccountVerified: true, createdAt: true, updatedAt: true },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
        const { password: _pw, ...userWithoutPassword } = user;

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

    async updateProfileImage(userId: number, imageUrl: string): Promise<Omit<User, 'password'>> {
        const user = await this.findOneWithPassword(userId);
        user.profileImage = imageUrl;
        await this.usersRepository.save(user);
        return this.getCurrentUser(userId);
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

    // ─── Email Verification ──────────────────────────────────────────────────

    async sendVerificationOtp(userId: number): Promise<{ message: string }> {
        const user = await this.findOneWithPassword(userId);
        if (user.isAccountVerified) {
            throw new BadRequestException('Account is already verified');
        }
        await this.issueOtp(user, OtpType.EMAIL_VERIFICATION);
        return { message: 'Verification OTP sent to your email' };
    }

    async verifyEmail(userId: number, code: string): Promise<{ message: string }> {
        const user = await this.findOneWithPassword(userId);
        if (user.isAccountVerified) {
            throw new BadRequestException('Account is already verified');
        }
        await this.consumeOtp(userId, code, OtpType.EMAIL_VERIFICATION);
        user.isAccountVerified = true;
        await this.usersRepository.save(user);
        return { message: 'Email verified successfully' };
    }

    // ─── Password Reset ──────────────────────────────────────────────────────

    async sendPasswordResetOtp(email: string): Promise<{ message: string }> {
        const successMsg = { message: 'If an account exists with this email, a reset OTP has been sent' };
        const user = await this.usersRepository.findOneBy({ email });
        if (!user) return successMsg;
        await this.issueOtp(user, OtpType.PASSWORD_RESET);
        return successMsg;
    }

    async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
        const user = await this.usersRepository.findOneBy({ email });
        if (!user) throw new BadRequestException('Invalid or expired OTP');

        await this.consumeOtp(user.id, code, OtpType.PASSWORD_RESET);
        user.password = await bcrypt.hash(newPassword, 10);
        await this.usersRepository.save(user);
        return { message: 'Password reset successfully' };
    }

    // ─── OTP helpers ─────────────────────────────────────────────────────────

    private async issueOtp(user: User, type: OtpType): Promise<void> {
        const latest = await this.otpRepository.findOne({
            where: { userId: user.id, type },
            order: { createdAt: 'DESC' },
        });

        if (latest) {
            const elapsed = Date.now() - latest.createdAt.getTime();
            if (elapsed < OTP_RATE_LIMIT_MS) {
                const waitSec = Math.ceil((OTP_RATE_LIMIT_MS - elapsed) / 1000);
                throw new BadRequestException(`Please wait ${waitSec} seconds before requesting a new OTP`);
            }
        }

        // Invalidate all previous OTPs of this type for the user
        await this.otpRepository.update(
            { userId: user.id, type, isUsed: false },
            { isUsed: true },
        );

        const code = Math.floor(100_000 + Math.random() * 900_000).toString();
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
        await this.otpRepository.save({ userId: user.id, code, type, expiresAt });

        if (type === OtpType.EMAIL_VERIFICATION) {
            await this.mailService.sendVerificationOtp(user.email, user.username, code);
        } else {
            await this.mailService.sendPasswordResetOtp(user.email, user.username, code);
        }
    }

    private async consumeOtp(userId: number, code: string, type: OtpType): Promise<void> {
        const otp = await this.otpRepository.findOne({
            where: { userId, code, type, isUsed: false },
        });

        if (!otp || otp.expiresAt < new Date()) {
            throw new BadRequestException('Invalid or expired OTP');
        }

        otp.isUsed = true;
        await this.otpRepository.save(otp);
    }

    // ─── Token helpers ───────────────────────────────────────────────────────

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
