import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum PushPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Entity({ name: 'push_tokens' })
export class PushToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  userId!: number;

  @Index({ unique: true })
  @Column()
  token!: string;

  @Column({ type: 'enum', enum: PushPlatform })
  platform!: PushPlatform;

  @CreateDateColumn()
  createdAt!: Date;
}
