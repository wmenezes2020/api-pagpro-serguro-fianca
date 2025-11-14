import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RentalApplication } from './rental-application.entity';
import { RiskLevel } from '../../../common/enums/risk-level.enum';

@Entity('cliente_psf_credit_analyses')
export class CreditAnalysis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(
    () => RentalApplication,
    (application) => application.creditAnalysis,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  application: RentalApplication;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'enum', enum: RiskLevel })
  riskLevel: RiskLevel;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  maximumCoverage: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  recommendedMonthlyFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  recommendedAdhesionFee: number;

  @Column({ type: 'json', nullable: true })
  indicators?: Record<string, unknown>;

  @Column({ nullable: true })
  analystNotes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
