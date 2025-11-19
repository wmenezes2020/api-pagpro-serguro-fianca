import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ImobiliariaProfile } from './imobiliaria-profile.entity';
import { InquilinoProfile } from './inquilino-profile.entity';
import { CorretorProfile } from './corretor-profile.entity';
import { FranqueadoProfile } from './franqueado-profile.entity';
import { RentalApplication } from '../../applications/entities/rental-application.entity';
import { SupportTicket } from '../../support/entities/support-ticket.entity';
import { Property } from '../../applications/entities/property.entity';
import { Notification } from '../../notifications/entities/notification.entity';
@Entity('cliente_psf_users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  refreshTokenHash?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => ImobiliariaProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  imobiliariaProfile?: ImobiliariaProfile;

  @OneToOne(() => InquilinoProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  inquilinoProfile?: InquilinoProfile;

  @OneToOne(() => CorretorProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  corretorProfile?: CorretorProfile;

  @OneToOne(() => FranqueadoProfile, (profile) => profile.user, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  franqueadoProfile?: FranqueadoProfile;

  @ManyToOne(() => User, (user) => user.children, { nullable: true })
  @JoinColumn({ name: 'parent_user_id' })
  parent?: User;

  @OneToMany(() => User, (user) => user.parent)
  children?: User[];

  @OneToMany(() => RentalApplication, (application) => application.applicant)
  applicationsAsApplicant?: RentalApplication[];

  @OneToMany(() => RentalApplication, (application) => application.broker)
  applicationsAsBroker?: RentalApplication[];

  @OneToMany(() => SupportTicket, (ticket) => ticket.createdBy)
  supportTickets?: SupportTicket[];

  @OneToMany(() => Property, (property) => property.owner)
  properties?: Property[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications?: Notification[];
}
