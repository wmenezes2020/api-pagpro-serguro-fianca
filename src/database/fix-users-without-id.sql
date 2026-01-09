-- Script para corrigir usuários sem ID válido na tabela cliente_psf_users
-- Execute este script manualmente no banco de dados se necessário

-- 1. Verificar usuários sem ID ou com ID vazio
SELECT 
    email, 
    id, 
    role, 
    fullName,
    CASE 
        WHEN id IS NULL THEN 'ID NULL'
        WHEN id = '' THEN 'ID VAZIO'
        WHEN LENGTH(TRIM(id)) = 0 THEN 'ID APENAS ESPAÇOS'
        ELSE 'ID VÁLIDO'
    END as status_id
FROM cliente_psf_users
WHERE id IS NULL 
   OR id = '' 
   OR LENGTH(TRIM(id)) = 0;

-- 2. Gerar IDs UUID para usuários sem ID válido
-- ATENÇÃO: Execute apenas se tiver certeza que deseja corrigir
-- Descomente as linhas abaixo para executar:

/*
UPDATE cliente_psf_users
SET id = UUID()
WHERE id IS NULL 
   OR id = '' 
   OR LENGTH(TRIM(id)) = 0;
*/

-- 3. Verificar se há duplicatas de email (após correção)
SELECT email, COUNT(*) as count
FROM cliente_psf_users
GROUP BY email
HAVING COUNT(*) > 1;
