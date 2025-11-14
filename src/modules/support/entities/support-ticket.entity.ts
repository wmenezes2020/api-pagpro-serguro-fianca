import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TicketStatus } from '../../../common/enums/ticket-status.enum';

@Entity('cliente_psf_support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.supportTickets, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  createdBy: User;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn()
  assignedTo?: User;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
