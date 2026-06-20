import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Review } from '../reviews/review.entity';

export enum UserType {
    ADMIN = 'admin',
    USER = 'user',
    SUPER_ADMIN = 'super_admin',
}

@Entity({ name: 'users' })
export class User {
    @ApiProperty({ example: 1, description: 'The unique identifier of the user' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ApiProperty({ example: 'johndoe', description: 'The username of the user' })
    @Column({ unique: true, type: 'varchar', length: 150 })
    username!: string;

    @ApiProperty({ example: 'johndoe@example.com', description: 'The email of the user' })
    @Column({ unique: true, type: 'varchar', length: 150 })
    email!: string;

    @Exclude()
    @Column()
    password!: string;

    @ApiProperty({ enum: UserType, description: 'The type of the user' })
    @Column({ type: 'enum', enum: UserType, default: UserType.USER })
    userType!: UserType;

    @ApiProperty({ example: true, description: 'Indicates if the user\'s account is verified' })
    @Column({ default: false })
    isAccountVerified!: boolean;

    @ApiProperty({ example: false, description: 'Indicates if the user is banned' })
    @Column({ default: false })
    isBanned!: boolean;

    @ApiProperty({
        example: 'https://example.com/profile.jpg',
        description: 'The URL of the user\'s profile image',
        nullable: true,
    })
    @Column({ type: 'varchar', nullable: true })
    profileImage!: string | null;

    @OneToMany(() => Review, (review) => review.user)
    reviews!: Review[];

    @ApiProperty({ description: 'The date and time the user was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the user was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}