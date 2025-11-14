import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('cliente_psf_corretor_profiles')
export class CorretorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.corretorProfile, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column()
  fullName: string;

  @Column({ unique: true })
  cpf: string;

  @Column({ nullable: true })
  creci?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  brokerageName?: string;
}
