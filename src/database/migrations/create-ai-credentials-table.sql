-- Migration: Criar tabela de credenciais de IA para sistema de LLMs dinâmicos
-- Data: 2025-01-08

CREATE TABLE IF NOT EXISTS `cliente_psf_ai_credentials` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company_id` VARCHAR(255) NULL,
  `name` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive', 'error') DEFAULT 'active',
  `usageCount` INT DEFAULT 0,
  `errorCount` INT DEFAULT 0,
  `lastError` TEXT NULL,
  `isActive` BOOLEAN DEFAULT TRUE,
  `apiKey` VARCHAR(500) NOT NULL,
  `model` VARCHAR(255) NOT NULL,
  `llm` ENUM('gemini', 'openai', 'azure') DEFAULT 'gemini',
  `lastUsed` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_company_id` (`company_id`),
  INDEX `idx_llm` (`llm`),
  INDEX `idx_is_active` (`isActive`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exemplo de inserção de credenciais (substitua com suas chaves reais)
-- INSERT INTO `cliente_psf_ai_credentials` (`name`, `apiKey`, `model`, `llm`, `isActive`, `status`) VALUES
-- ('Gemini Principal', 'SUA_CHAVE_GEMINI_AQUI', 'gemini-2.0-flash-exp', 'gemini', TRUE, 'active'),
-- ('OpenAI Principal', 'SUA_CHAVE_OPENAI_AQUI', 'gpt-4o-mini', 'openai', TRUE, 'active');
