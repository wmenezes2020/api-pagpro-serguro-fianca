import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RentalApplication } from '../../applications/entities/rental-application.entity';
import { Referral } from './referral.entity';

@Entity('cliente_psf_commissions')
export class Commission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  beneficiary: User; // Quem recebe a comissão

  @ManyToOne(() => RentalApplication, { nullable: true })
  application?: RentalApplication;

  @ManyToOne(() => Referral, { nullable: true })
  referral?: Referral;

  @Column({ type: 'varchar', length: 50 })
  commissionType: string; // 'SETUP_FEE', 'MONTHLY_FEE', 'REFERRAL'

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] })
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

  @Column({ type: 'date', nullable: true })
  paidAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
