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

  @Column({ type: 'enum', enum: ['BOLETO', 'PIX'], default: 'BOLETO' })
  paymentMethod: 'BOLETO' | 'PIX';

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

  @Column({ nullable: true })
  paymentReference?: string;

  @Column({ nullable: true })
  barcode?: string;

  @Column({ type: 'text', nullable: true })
  qrCode?: string;

  @Column({ nullable: true })
  qrCodeImageUrl?: string;

  @Column({ nullable: true })
  externalPaymentId?: string;

  @Column({ type: 'json', nullable: true })
  paymentMetadata?: Record<string, unknown>;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
