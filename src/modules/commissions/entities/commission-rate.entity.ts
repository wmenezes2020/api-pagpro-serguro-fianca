import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';

@Entity('cliente_psf_commission_rates')
export class CommissionRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole; // FRANQUIADO, IMOBILIARIA, CORRETOR, INQUILINO

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number; // Percentual de comissão (ex: 5.00 = 5%)

  @Column({ type: 'varchar', length: 50 })
  commissionType: string; // 'SETUP_FEE', 'MONTHLY_FEE', 'REFERRAL'

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
