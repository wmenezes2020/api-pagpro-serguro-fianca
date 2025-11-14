import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('cliente_psf_documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  uploadedBy: User;

  @Column()
  fileName: string;

  @Column()
  originalFileName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column()
  blobUrl: string;

  @Column()
  blobContainer: string;

  @Column()
  blobName: string;

  @Column({ nullable: true })
  relatedEntityType?: string;

  @Column({ nullable: true })
  relatedEntityId?: string;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
