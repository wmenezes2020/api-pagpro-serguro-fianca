-- =====================================================
-- PagPro Seguro Fiança - Seed de Dados Iniciais
-- =====================================================
-- Este arquivo popula o banco de dados com dados iniciais
-- incluindo usuário administrador padrão.
--
-- ATENÇÃO: Execute este script APÓS criar a estrutura do banco (schema.sql)
-- =====================================================

USE pagpro_db;

-- =====================================================
-- USUÁRIO ADMINISTRADOR PADRÃO
-- =====================================================
-- Senha: PagPro@2025 (hash bcrypt)
-- Para gerar um novo hash, use: bcrypt.hash('sua_senha', 10)

INSERT INTO `cliente_psf_users` (
  `id`,
  `email`,
  `passwordHash`,
  `role`,
  `isActive`,
  `fullName`,
  `createdAt`,
  `updatedAt`
) VALUES (
  UUID(),
  'admin@pagproseguro.com.br',
  '$2b$10$4LrNIjjrsjWxUJW92VNhku.5Va.EuZdgLH/XeiG9maVvxFl8OxcLW', -- Hash bcrypt da senha: PagPro@2025
  'ADMIN',
  TRUE,
  'Administrador PagPro',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE `email` = `email`;

-- =====================================================
-- CREDENCIAIS DO ADMINISTRADOR
-- =====================================================
-- Email: admin@pagproseguro.com.br
-- Senha: PagPro@2025
--
-- IMPORTANTE: Altere a senha após o primeiro acesso!
-- =====================================================
--
-- NOTAS:
-- 1. O usuário admin será criado apenas se não existir
--    (ON DUPLICATE KEY UPDATE garante que não haverá erro)
--
-- 2. Para usar o seed via TypeScript (recomendado):
--    npm run db:seed
--
-- 3. Para gerar um novo hash de senha:
--    cd backend && node -e "const bcrypt = require('bcrypt'); bcrypt.hash('sua_senha', 10).then(h => console.log(h))"
-- =====================================================

