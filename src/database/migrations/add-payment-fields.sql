-- Migration: Adicionar campos de método de pagamento e dados de boleto/PIX
-- Data: 2026-01-08

ALTER TABLE `cliente_psf_payment_schedules`
ADD COLUMN `paymentMethod` ENUM('BOLETO', 'PIX') NOT NULL DEFAULT 'BOLETO' COMMENT 'Método de pagamento: Boleto ou PIX' AFTER `status`,
ADD COLUMN `barcode` VARCHAR(255) NULL COMMENT 'Código de barras do boleto' AFTER `paymentReference`,
ADD COLUMN `qrCode` TEXT NULL COMMENT 'QR Code do PIX (EMV format)' AFTER `barcode`,
ADD COLUMN `qrCodeImageUrl` VARCHAR(500) NULL COMMENT 'URL da imagem do QR Code' AFTER `qrCode`,
ADD COLUMN `externalPaymentId` VARCHAR(255) NULL COMMENT 'ID do pagamento no provedor externo' AFTER `qrCodeImageUrl`,
ADD COLUMN `paymentMetadata` JSON NULL COMMENT 'Metadados adicionais do pagamento' AFTER `externalPaymentId`;

-- Índices para melhorar performance
CREATE INDEX `idx_payment_method` ON `cliente_psf_payment_schedules` (`paymentMethod`);
CREATE INDEX `idx_payment_external_id` ON `cliente_psf_payment_schedules` (`externalPaymentId`);
