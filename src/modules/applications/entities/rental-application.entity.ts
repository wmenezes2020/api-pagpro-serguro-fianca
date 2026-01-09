import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { User } from '../../users/entities/user.entity';
import { ApplicationStatus } from '../../../common/enums/application-status.enum';
import { CreditAnalysis } from './credit-analysis.entity';
import { InsurancePolicy } from './insurance-policy.entity';

@Entity('cliente_psf_rental_applications')
export class RentalApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  applicationNumber: string;

  @ManyToOne(() => Property, (property) => property.applications, {
    eager: true,
  })
  property: Property;

  @ManyToOne(() => User, (user) => user.applicationsAsApplicant, {
    eager: true,
  })
  applicant: User;

  @ManyToOne(() => User, (user) => user.applicationsAsBroker, {
    eager: true,
    nullable: true,
  })
  broker?: User;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
  })
  status: ApplicationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  requestedRentValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  monthlyIncome: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyRentValue?: number;

  @Column({ type: 'enum', enum: ['COMERCIAL', 'RESIDENCIAL'], nullable: true })
  contractType?: 'COMERCIAL' | 'RESIDENCIAL';

  @Column({ type: 'enum', enum: ['PF', 'PJ'], nullable: true })
  tenantType?: 'PF' | 'PJ';

  @Column({ default: false })
  hasNegativeRecords: boolean;

  @Column({ nullable: true })
  employmentStatus?: string;

  @Column({ type: 'json', nullable: true })
  documents?: Record<string, string>;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => CreditAnalysis, (analysis) => analysis.application)
  creditAnalysis?: CreditAnalysis;

  @OneToOne(() => InsurancePolicy, (policy) => policy.application)
  insurancePolicy?: InsurancePolicy;
}
