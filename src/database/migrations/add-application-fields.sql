-- Migration: Adicionar campos contractType, tenantType e monthlyRentValue na tabela de aplicações
-- Data: 2026-01-08

ALTER TABLE `cliente_psf_rental_applications`
ADD COLUMN `monthlyRentValue` DECIMAL(10, 2) NULL COMMENT 'Valor do aluguel mensal do contrato' AFTER `monthlyIncome`,
ADD COLUMN `contractType` ENUM('COMERCIAL', 'RESIDENCIAL') NULL COMMENT 'Tipo de contrato: COMERCIAL ou RESIDENCIAL' AFTER `monthlyRentValue`,
ADD COLUMN `tenantType` ENUM('PF', 'PJ') NULL COMMENT 'Tipo de inquilino: Pessoa Física (PF) ou Pessoa Jurídica (PJ)' AFTER `contractType`;

-- Índices para melhorar performance de consultas
CREATE INDEX `idx_rental_applications_contract_type` ON `cliente_psf_rental_applications` (`contractType`);
CREATE INDEX `idx_rental_applications_tenant_type` ON `cliente_psf_rental_applications` (`tenantType`);
