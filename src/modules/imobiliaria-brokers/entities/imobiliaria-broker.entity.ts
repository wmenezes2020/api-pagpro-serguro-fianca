import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BrokerStatus } from '../../../common/enums/broker-status.enum';

@Entity('cliente_psf_imobiliaria_brokers')
export class ImobiliariaBroker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  owner: User;

  @Column()
  fullName: string;

  @Column({ length: 14 })
  cpf: string;

  @Column({ nullable: true })
  creci?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: BrokerStatus,
    default: BrokerStatus.INVITED,
  })
  status: BrokerStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
