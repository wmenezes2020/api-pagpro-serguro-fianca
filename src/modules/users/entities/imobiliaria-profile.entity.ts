import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('cliente_psf_imobiliaria_profiles')
export class ImobiliariaProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.imobiliariaProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: User;

  @Column()
  companyName: string;

  @Column({ unique: true })
  cnpj: string;

  @Column({ nullable: true })
  creci?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  postalCode?: string;
}
