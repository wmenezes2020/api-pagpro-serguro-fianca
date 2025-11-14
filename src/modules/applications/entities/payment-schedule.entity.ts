import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InsurancePolicy } from './insurance-policy.entity';
import { PaymentStatus } from '../../../common/enums/payment-status.enum';

@Entity('cliente_psf_payment_schedules')
export class PaymentSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => InsurancePolicy, (policy) => policy.paymentSchedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  policy: InsurancePolicy;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  paymentReference?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
