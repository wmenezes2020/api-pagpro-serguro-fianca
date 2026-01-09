import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CredentialStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

@Entity({ name: 'cliente_psf_ai_credentials' })
export class AiCredential {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id', nullable: true })
  companyId: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: CredentialStatus,
    default: CredentialStatus.ACTIVE,
  })
  status: CredentialStatus;

  @Column({ nullable: true, default: 0 })
  usageCount: number;

  @Column({ nullable: true, default: 0 })
  errorCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ select: false }) // `select: false` para não expor a chave em queries normais
  apiKey: string;

  @Column()
  model: string;

  @Column({
    type: 'enum',
    enum: ['gemini', 'openai', 'azure'],
    default: 'gemini',
  })
  llm: 'gemini' | 'openai' | 'azure';

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
