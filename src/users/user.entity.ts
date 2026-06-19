import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Review } from '../reviews/review.entity';

export enum UserType {
    ADMIN = 'admin',
    USER = 'user',
    SUPER_ADMIN="super_admin"
}

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true ,type:'varchar',length: 150 })
    username!: string;

    @Column({ unique: true ,type:'varchar',length: 150 })
    email!: string;

    @Exclude()
    @Column()
    password!: string;

    @Column({ type: 'enum', enum: UserType, default: UserType.USER })
    userType!: UserType;

    @Column({ default: false })
    isAccountVerified!: boolean;

    @Column({ default: false })
    isBanned!: boolean;

    @Column({ type: 'varchar', nullable: true })
    profileImage!: string | null;

    @OneToMany(() => Review, (review) => review.user)
    reviews!: Review[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
