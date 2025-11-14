import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('cliente_psf_inquilino_profiles')
export class InquilinoProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.inquilinoProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column()
  fullName: string;

  @Column({ unique: true })
  cpf: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyIncome: number;

  @Column({ default: false })
  hasNegativeRecords: boolean;

  @Column({ nullable: true })
  employmentStatus?: string;
}
