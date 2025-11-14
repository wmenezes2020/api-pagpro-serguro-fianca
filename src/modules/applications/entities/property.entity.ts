import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { RentalApplication } from './rental-application.entity';

@Entity('cliente_psf_properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.properties, {
    onDelete: 'CASCADE',
  })
  owner: User;

  @Column()
  title: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  rentValue: number;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PropertyStatus,
    default: PropertyStatus.AVAILABLE,
  })
  status: PropertyStatus;

  @Column({ type: 'json', nullable: true })
  amenities?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RentalApplication, (application) => application.property)
  applications?: RentalApplication[];
}
