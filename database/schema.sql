-- =====================================================
-- PagPro Seguro Fiança - Estrutura do Banco de Dados
-- =====================================================
-- Este arquivo contém a estrutura completa do banco de dados
-- incluindo todas as tabelas, enums, relacionamentos e índices.
--
-- Versão: 1.0
-- Data: 2025-01-27
-- =====================================================

-- Criar banco de dados (se não existir)
-- CREATE DATABASE IF NOT EXISTS pagpro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- USE pagpro_db;

-- =====================================================
-- ENUMS (definidos como ENUM no MySQL)
-- =====================================================

-- Nota: MySQL não suporta ENUMs reutilizáveis, então cada coluna
-- que usa um enum terá sua definição inline na tabela.

-- =====================================================
-- TABELA: cliente_psf_users
-- =====================================================
-- Usuários do sistema (admin, imobiliária, inquilino, corretor)
DROP TABLE IF EXISTS `cliente_psf_users`;
CREATE TABLE IF NOT EXISTS `cliente_psf_users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do usuário',
  `email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Email único do usuário',
  `passwordHash` VARCHAR(255) NOT NULL COMMENT 'Hash da senha (bcrypt)',
  `role` ENUM('ADMIN', 'IMOBILIARIA', 'INQUILINO', 'CORRETOR') NOT NULL COMMENT 'Papel do usuário no sistema',
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Usuário ativo/inativo',
  `fullName` VARCHAR(255) NULL COMMENT 'Nome completo',
  `phone` VARCHAR(20) NULL COMMENT 'Telefone de contato',
  `refreshTokenHash` VARCHAR(255) NULL COMMENT 'Hash do refresh token',
  `passwordResetToken` VARCHAR(255) NULL COMMENT 'Token para recuperação de senha',
  `passwordResetTokenExpiresAt` TIMESTAMP NULL COMMENT 'Data de expiração do token de reset',
  `lastLoginAt` TIMESTAMP NULL COMMENT 'Último login do usuário',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_cliente_psf_users_email` (`email`),
  INDEX `idx_cliente_psf_users_role` (`role`),
  INDEX `idx_cliente_psf_users_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de usuários do sistema';

-- =====================================================
-- TABELA: cliente_psf_imobiliaria_profiles
-- =====================================================
-- Perfil específico de imobiliárias
DROP TABLE IF EXISTS `cliente_psf_imobiliaria_profiles`;
CREATE TABLE IF NOT EXISTS `cliente_psf_imobiliaria_profiles` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do perfil',
  `userId` CHAR(36) NOT NULL UNIQUE COMMENT 'FK para cliente_psf_users.id',
  `companyName` VARCHAR(255) NOT NULL COMMENT 'Razão social da imobiliária',
  `cnpj` VARCHAR(18) NOT NULL UNIQUE COMMENT 'CNPJ único da imobiliária',
  `creci` VARCHAR(20) NULL COMMENT 'CRECI da imobiliária',
  `website` VARCHAR(255) NULL COMMENT 'Website da imobiliária',
  `address` VARCHAR(255) NULL COMMENT 'Endereço completo',
  `city` VARCHAR(100) NULL COMMENT 'Cidade',
  `state` VARCHAR(2) NULL COMMENT 'Estado (UF)',
  `postalCode` VARCHAR(10) NULL COMMENT 'CEP',
  INDEX `idx_imobiliaria_cnpj` (`cnpj`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfis de imobiliárias';

-- =====================================================
-- TABELA: cliente_psf_inquilino_profiles
-- =====================================================
-- Perfil específico de inquilinos
DROP TABLE IF EXISTS `cliente_psf_inquilino_profiles`;
CREATE TABLE IF NOT EXISTS `cliente_psf_inquilino_profiles` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do perfil',
  `userId` CHAR(36) NOT NULL UNIQUE COMMENT 'FK para cliente_psf_users.id',
  `fullName` VARCHAR(255) NOT NULL COMMENT 'Nome completo do inquilino',
  `cpf` VARCHAR(14) NOT NULL UNIQUE COMMENT 'CPF único do inquilino',
  `birthDate` DATE NULL COMMENT 'Data de nascimento',
  `phone` VARCHAR(20) NULL COMMENT 'Telefone de contato',
  `monthlyIncome` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Renda mensal',
  `hasNegativeRecords` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Possui restrições em órgãos de crédito',
  `employmentStatus` VARCHAR(100) NULL COMMENT 'Situação profissional (CLT, PJ, etc.)',
  INDEX `idx_inquilino_cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfis de inquilinos';

-- =====================================================
-- TABELA: cliente_psf_corretor_profiles
-- =====================================================
-- Perfil específico de corretores
DROP TABLE IF EXISTS `cliente_psf_corretor_profiles`;
CREATE TABLE IF NOT EXISTS `cliente_psf_corretor_profiles` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do perfil',
  `userId` CHAR(36) NOT NULL UNIQUE COMMENT 'FK para cliente_psf_users.id',
  `fullName` VARCHAR(255) NOT NULL COMMENT 'Nome completo do corretor',
  `cpf` VARCHAR(14) NOT NULL UNIQUE COMMENT 'CPF único do corretor',
  `creci` VARCHAR(20) NULL COMMENT 'CRECI do corretor',
  `phone` VARCHAR(20) NULL COMMENT 'Telefone de contato',
  `brokerageName` VARCHAR(255) NULL COMMENT 'Nome da imobiliária onde trabalha',
  INDEX `idx_corretor_cpf` (`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfis de corretores';

-- =====================================================
-- TABELA: cliente_psf_properties
-- =====================================================
-- Imóveis cadastrados pelas imobiliárias
DROP TABLE IF EXISTS `cliente_psf_properties`;
CREATE TABLE IF NOT EXISTS `cliente_psf_properties` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do imóvel',
  `ownerId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id (imobiliária proprietária)',
  `title` VARCHAR(255) NOT NULL COMMENT 'Título/descrição do imóvel',
  `address` VARCHAR(255) NOT NULL COMMENT 'Endereço completo',
  `city` VARCHAR(100) NOT NULL COMMENT 'Cidade',
  `state` VARCHAR(2) NOT NULL COMMENT 'Estado (UF)',
  `postalCode` VARCHAR(10) NOT NULL COMMENT 'CEP',
  `rentValue` DECIMAL(10,2) NOT NULL COMMENT 'Valor do aluguel',
  `description` TEXT NULL COMMENT 'Descrição detalhada do imóvel',
  `status` ENUM('AVAILABLE', 'RESERVED', 'RENTED') NOT NULL DEFAULT 'AVAILABLE' COMMENT 'Status do imóvel',
  `amenities` JSON NULL COMMENT 'Comodidades do imóvel (JSON)',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_property_owner` (`ownerId`),
  INDEX `idx_property_status` (`status`),
  INDEX `idx_property_city_state` (`city`, `state`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Imóveis cadastrados';

-- =====================================================
-- TABELA: cliente_psf_rental_applications
-- =====================================================
-- Solicitações de seguro fiança
DROP TABLE IF EXISTS `cliente_psf_rental_applications`;
CREATE TABLE IF NOT EXISTS `cliente_psf_rental_applications` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID da solicitação',
  `applicationNumber` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Número único da solicitação',
  `propertyId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_properties.id',
  `applicantId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id (inquilino solicitante)',
  `brokerId` CHAR(36) NULL COMMENT 'FK para cliente_psf_users.id (corretor, opcional)',
  `status` ENUM('SUBMITTED', 'IN_ANALYSIS', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'SUBMITTED' COMMENT 'Status da solicitação',
  `requestedRentValue` DECIMAL(10,2) NOT NULL COMMENT 'Valor do aluguel solicitado',
  `monthlyIncome` DECIMAL(10,2) NOT NULL COMMENT 'Renda mensal do solicitante',
  `hasNegativeRecords` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Possui restrições em órgãos de crédito',
  `employmentStatus` VARCHAR(100) NULL COMMENT 'Situação profissional',
  `documents` JSON NULL COMMENT 'Metadados dos documentos anexados (JSON)',
  `notes` TEXT NULL COMMENT 'Notas internas sobre a solicitação',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_application_number` (`applicationNumber`),
  INDEX `idx_application_property` (`propertyId`),
  INDEX `idx_application_applicant` (`applicantId`),
  INDEX `idx_application_broker` (`brokerId`),
  INDEX `idx_application_status` (`status`),
  INDEX `idx_application_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Solicitações de seguro fiança';

-- =====================================================
-- TABELA: cliente_psf_credit_analyses
-- =====================================================
-- Análises de crédito das solicitações
DROP TABLE IF EXISTS `cliente_psf_credit_analyses`;
CREATE TABLE IF NOT EXISTS `cliente_psf_credit_analyses` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID da análise',
  `applicationId` CHAR(36) NOT NULL UNIQUE COMMENT 'FK para cliente_psf_rental_applications.id',
  `score` INT NOT NULL COMMENT 'Score de crédito (0-100)',
  `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL COMMENT 'Nível de risco',
  `maximumCoverage` DECIMAL(10,2) NOT NULL COMMENT 'Cobertura máxima calculada',
  `recommendedMonthlyFee` DECIMAL(10,2) NOT NULL COMMENT 'Taxa mensal recomendada',
  `recommendedAdhesionFee` DECIMAL(10,2) NOT NULL COMMENT 'Taxa de adesão recomendada',
  `indicators` JSON NULL COMMENT 'Indicadores da análise (JSON)',
  `analystNotes` TEXT NULL COMMENT 'Notas do analista',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  INDEX `idx_analysis_application` (`applicationId`),
  INDEX `idx_analysis_score` (`score`),
  INDEX `idx_analysis_risk` (`riskLevel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Análises de crédito';

-- =====================================================
-- TABELA: cliente_psf_insurance_policies
-- =====================================================
-- Apólices de seguro emitidas
DROP TABLE IF EXISTS `cliente_psf_insurance_policies`;
CREATE TABLE IF NOT EXISTS `cliente_psf_insurance_policies` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID da apólice',
  `policyNumber` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Número único da apólice',
  `applicationId` CHAR(36) NOT NULL UNIQUE COMMENT 'FK para cliente_psf_rental_applications.id',
  `status` ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'CLOSED') NOT NULL DEFAULT 'PENDING' COMMENT 'Status da apólice',
  `coverageAmount` DECIMAL(12,2) NOT NULL COMMENT 'Valor da cobertura',
  `monthlyPremium` DECIMAL(10,2) NOT NULL COMMENT 'Prêmio mensal',
  `adhesionFee` DECIMAL(10,2) NOT NULL COMMENT 'Taxa de adesão',
  `startDate` DATE NULL COMMENT 'Data de início da cobertura',
  `endDate` DATE NULL COMMENT 'Data de término da cobertura',
  `contractUrl` VARCHAR(500) NULL COMMENT 'URL do contrato',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_policy_number` (`policyNumber`),
  INDEX `idx_policy_application` (`applicationId`),
  INDEX `idx_policy_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Apólices de seguro';

-- =====================================================
-- TABELA: cliente_psf_payment_schedules
-- =====================================================
-- Cronograma de pagamentos das apólices
DROP TABLE IF EXISTS `cliente_psf_payment_schedules`;
CREATE TABLE IF NOT EXISTS `cliente_psf_payment_schedules` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do pagamento',
  `policyId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_insurance_policies.id',
  `dueDate` DATE NOT NULL COMMENT 'Data de vencimento',
  `amount` DECIMAL(10,2) NOT NULL COMMENT 'Valor da parcela',
  `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING' COMMENT 'Status do pagamento',
  `paidAt` TIMESTAMP NULL COMMENT 'Data de pagamento',
  `paymentReference` VARCHAR(255) NULL COMMENT 'Referência do pagamento',
  `notes` TEXT NULL COMMENT 'Notas sobre o pagamento',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_payment_policy` (`policyId`),
  INDEX `idx_payment_status` (`status`),
  INDEX `idx_payment_due_date` (`dueDate`),
  INDEX `idx_payment_overdue` (`status`, `dueDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Cronograma de pagamentos';

-- =====================================================
-- TABELA: cliente_psf_support_tickets
-- =====================================================
-- Tickets de suporte
DROP TABLE IF EXISTS `cliente_psf_support_tickets`;
CREATE TABLE IF NOT EXISTS `cliente_psf_support_tickets` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do ticket',
  `createdById` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id (criador do ticket)',
  `assignedToId` CHAR(36) NULL COMMENT 'FK para cliente_psf_users.id (atribuído a)',
  `subject` VARCHAR(255) NOT NULL COMMENT 'Assunto do ticket',
  `message` TEXT NOT NULL COMMENT 'Mensagem do ticket',
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN' COMMENT 'Status do ticket',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_ticket_created_by` (`createdById`),
  INDEX `idx_ticket_assigned_to` (`assignedToId`),
  INDEX `idx_ticket_status` (`status`),
  INDEX `idx_ticket_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tickets de suporte';

-- =====================================================
-- TABELA: cliente_psf_imobiliaria_clients
-- =====================================================
-- Clientes gerenciados pela imobiliária
DROP TABLE IF EXISTS `cliente_psf_imobiliaria_clients`;
CREATE TABLE IF NOT EXISTS `cliente_psf_imobiliaria_clients` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do cliente',
  `ownerId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id (imobiliária)',
  `fullName` VARCHAR(120) NOT NULL COMMENT 'Nome completo do cliente',
  `document` VARCHAR(20) NOT NULL COMMENT 'CPF/CNPJ do cliente',
  `email` VARCHAR(255) NULL COMMENT 'Email de contato',
  `phone` VARCHAR(20) NULL COMMENT 'Telefone',
  `monthlyIncome` DECIMAL(10,2) NULL COMMENT 'Renda mensal declarada',
  `origin` VARCHAR(50) NULL COMMENT 'Origem do lead (campanha, indicação, etc.)',
  `status` ENUM('NEW','IN_ANALYSIS','APPROVED','REJECTED','DOCUMENTS_PENDING','ONBOARDING') NOT NULL DEFAULT 'NEW' COMMENT 'Status do cliente no funil',
  `notes` TEXT NULL COMMENT 'Notas internas',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_imob_clients_owner` (`ownerId`),
  INDEX `idx_imob_clients_document` (`document`),
  INDEX `idx_imob_clients_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes gerenciados pelas imobiliárias';

-- =====================================================
-- TABELA: cliente_psf_imobiliaria_brokers
-- =====================================================
-- Corretores vinculados à imobiliária
DROP TABLE IF EXISTS `cliente_psf_imobiliaria_brokers`;
CREATE TABLE IF NOT EXISTS `cliente_psf_imobiliaria_brokers` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do corretor',
  `ownerId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id (imobiliária)',
  `fullName` VARCHAR(120) NOT NULL COMMENT 'Nome completo do corretor',
  `cpf` VARCHAR(14) NOT NULL COMMENT 'CPF do corretor',
  `creci` VARCHAR(20) NULL COMMENT 'Registro CRECI',
  `email` VARCHAR(255) NULL COMMENT 'Email de contato',
  `phone` VARCHAR(20) NULL COMMENT 'Telefone',
  `status` ENUM('ACTIVE','INACTIVE','INVITED','PENDING_DOCUMENTS') NOT NULL DEFAULT 'INVITED' COMMENT 'Status do corretor',
  `notes` TEXT NULL COMMENT 'Notas internas',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_imob_brokers_owner` (`ownerId`),
  INDEX `idx_imob_brokers_cpf` (`cpf`),
  INDEX `idx_imob_brokers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Corretores vinculados às imobiliárias';

-- =====================================================
-- TABELA: cliente_psf_notifications
-- =====================================================
-- Notificações do sistema
DROP TABLE IF EXISTS `cliente_psf_notifications`;
CREATE TABLE IF NOT EXISTS `cliente_psf_notifications` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID da notificação',
  `userId` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id',
  `type` ENUM(
    'APPLICATION_STATUS_CHANGED',
    'APPLICATION_APPROVED',
    'APPLICATION_REJECTED',
    'POLICY_ISSUED',
    'PAYMENT_DUE',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'SUPPORT_TICKET_CREATED',
    'SUPPORT_TICKET_UPDATED',
    'SYSTEM_ANNOUNCEMENT'
  ) NOT NULL COMMENT 'Tipo da notificação',
  `title` VARCHAR(255) NOT NULL COMMENT 'Título da notificação',
  `message` TEXT NOT NULL COMMENT 'Mensagem da notificação',
  `read` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Notificação lida/não lida',
  `metadata` JSON NULL COMMENT 'Metadados adicionais (JSON)',
  `readAt` TIMESTAMP NULL COMMENT 'Data de leitura',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_notification_user` (`userId`),
  INDEX `idx_notification_type` (`type`),
  INDEX `idx_notification_read` (`read`),
  INDEX `idx_notification_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificações do sistema';

-- =====================================================
-- TABELA: cliente_psf_documents
-- =====================================================
-- Documentos armazenados no Azure Blob Storage
DROP TABLE IF EXISTS `cliente_psf_documents`;
CREATE TABLE IF NOT EXISTS `cliente_psf_documents` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID do documento',
  `uploadedById` CHAR(36) NOT NULL COMMENT 'FK para cliente_psf_users.id',
  `fileName` VARCHAR(255) NOT NULL COMMENT 'Nome do arquivo',
  `originalFileName` VARCHAR(255) NOT NULL COMMENT 'Nome original do arquivo',
  `mimeType` VARCHAR(100) NOT NULL COMMENT 'Tipo MIME do arquivo',
  `size` BIGINT NOT NULL COMMENT 'Tamanho do arquivo em bytes',
  `blobUrl` VARCHAR(500) NOT NULL COMMENT 'URL do blob no Azure',
  `blobContainer` VARCHAR(100) NOT NULL COMMENT 'Container do Azure Blob',
  `blobName` VARCHAR(500) NOT NULL COMMENT 'Nome do blob no Azure',
  `relatedEntityType` VARCHAR(50) NULL COMMENT 'Tipo da entidade relacionada (ex: APPLICATION)',
  `relatedEntityId` CHAR(36) NULL COMMENT 'ID da entidade relacionada',
  `description` TEXT NULL COMMENT 'Descrição do documento',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Data de criação',
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data de atualização',
  INDEX `idx_document_uploaded_by` (`uploadedById`),
  INDEX `idx_document_related` (`relatedEntityType`, `relatedEntityId`),
  INDEX `idx_document_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Documentos armazenados';

-- =====================================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- =====================================================

-- Índices compostos para consultas frequentes
CREATE INDEX `idx_users_role_active` ON `cliente_psf_users` (`role`, `isActive`);
CREATE INDEX `idx_applications_status_created` ON `cliente_psf_rental_applications` (`status`, `createdAt`);
CREATE INDEX `idx_payments_status_due` ON `cliente_psf_payment_schedules` (`status`, `dueDate`);
CREATE INDEX `idx_notifications_user_read` ON `cliente_psf_notifications` (`userId`, `read`);

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================
-- Este schema foi gerado baseado nas entidades TypeORM do projeto.
-- Todas as tabelas usam UUID (CHAR(36)) como chave primária.
-- Os relacionamentos estão configurados com CASCADE onde apropriado.
-- 
-- Para popular o banco com dados iniciais, execute o seed:
-- npm run db:seed
--
-- Para executar migrations do TypeORM:
-- npm run db:migrate
-- =====================================================

