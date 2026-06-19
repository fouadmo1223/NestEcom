import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'addresses' })
export class Address {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @Column()
    fullName!: string;

    @Column()
    phone!: string;

    @Column()
    street!: string;

    @Column()
    city!: string;

    @Column()
    state!: string;

    @Column()
    postalCode!: string;

    @Column({ default: 'Egypt' })
    country!: string;

    @Column({ default: false })
    isDefault!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
