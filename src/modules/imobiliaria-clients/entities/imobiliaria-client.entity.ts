import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ClientStatus } from '../../../common/enums/client-status.enum';

const decimalTransformer = {
  to: (value?: number | null) => (typeof value === 'number' ? value : null),
  from: (value?: string | null) =>
    value !== null && value !== undefined ? parseFloat(value) : null,
};

@Entity('cliente_psf_imobiliaria_clients')
export class ImobiliariaClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column()
  fullName: string;

  @Column({ length: 20 })
  document: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  monthlyIncome?: number | null;

  @Column({ nullable: true })
  origin?: string;

  @Column({
    type: 'enum',
    enum: ClientStatus,
    default: ClientStatus.NEW,
  })
  status: ClientStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
