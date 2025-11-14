import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RentalApplication } from './rental-application.entity';
import { PolicyStatus } from '../../../common/enums/policy-status.enum';
import { PaymentSchedule } from './payment-schedule.entity';

@Entity('cliente_psf_insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  policyNumber: string;

  @OneToOne(
    () => RentalApplication,
    (application) => application.insurancePolicy,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  application: RentalApplication;

  @Column({ type: 'enum', enum: PolicyStatus, default: PolicyStatus.PENDING })
  status: PolicyStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  coverageAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyPremium: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adhesionFee: number;

  @Column({ type: 'date', nullable: true })
  startDate?: Date;

  @Column({ type: 'date', nullable: true })
  endDate?: Date;

  @Column({ nullable: true })
  contractUrl?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PaymentSchedule, (payment) => payment.policy, {
    cascade: true,
  })
  paymentSchedule?: PaymentSchedule[];
}
