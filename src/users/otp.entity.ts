import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export enum OtpType {
    EMAIL_VERIFICATION = 'email_verification',
    PASSWORD_RESET = 'password_reset',
}

@Entity({ name: 'otps' })
export class Otp {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    userId!: number;

    @Column()
    code!: string;

    @Column({ type: 'enum', enum: OtpType })
    type!: OtpType;

    @Column()
    expiresAt!: Date;

    @Column({ default: false })
    isUsed!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;
}
