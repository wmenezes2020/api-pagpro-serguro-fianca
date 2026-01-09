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

@Entity('cliente_psf_referrals')
export class Referral {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  referrer: User; // Quem indicou

  @ManyToOne(() => User, { eager: true })
  referred: User; // Quem foi indicado

  @ManyToOne(() => RentalApplication, { nullable: true })
  application?: RentalApplication; // Aplicação relacionada

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'] })
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  commissionAmount?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
