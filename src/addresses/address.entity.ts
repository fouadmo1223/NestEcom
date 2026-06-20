import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity({ name: 'addresses' })
export class Address {
    @ApiProperty({ example: 1, description: 'The unique identifier of the address' })
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user!: User;

    @ApiProperty({ example: 'John Doe', description: 'The full name of the user' })
    @Column()
    fullName!: string;

    @ApiProperty({ example: '1234567890', description: 'The phone number of the user' })
    @Column()
    phone!: string;

    @ApiProperty({ example: '123 Main St', description: 'The street address' })
    @Column()
    street!: string;

    @ApiProperty({ example: 'Anytown', description: 'The city' })
    @Column()
    city!: string;

    @ApiProperty({ example: 'CA', description: 'The state or province' })
    @Column()
    state!: string;

    @ApiProperty({ example: '12345', description: 'The postal code' })
    @Column()
    postalCode!: string;

    @ApiProperty({ example: 'USA', description: 'The country' })
    @Column({ default: 'Egypt' })
    country!: string;

    @ApiProperty({ example: true, description: 'Whether this is the default address' })
    @Column({ default: false })
    isDefault!: boolean;

    @ApiProperty({ description: 'The date and time the address was created' })
    @CreateDateColumn()
    createdAt!: Date;

    @ApiProperty({ description: 'The date and time the address was last updated' })
    @UpdateDateColumn()
    updatedAt!: Date;
}