-- Script SQL para corrigir todas as tabelas com IDs vazios antes do TypeORM sincronizar
-- Execute este script diretamente no MySQL antes de iniciar a aplicação

-- Função auxiliar para corrigir uma tabela
-- Uso: CALL fix_table_primary_key('nome_da_tabela');

DELIMITER $$

DROP PROCEDURE IF EXISTS fix_table_primary_key$$

CREATE PROCEDURE fix_table_primary_key(IN table_name VARCHAR(255))
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;

    -- Verificar se a coluna id existe
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name
      AND COLUMN_NAME = 'id';

    -- Se a coluna não existe, adicionar como nullable
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', table_name, '` ADD COLUMN `id` CHAR(36) NULL');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;

    -- Deletar registros com IDs vazios ou inválidos
    SET @sql = CONCAT('DELETE FROM `', table_name, '` WHERE `id` IS NULL OR `id` = '' OR TRIM(`id`) = ''');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    -- Atualizar registros restantes com NULL para ter UUID válido
    SET @sql = CONCAT('UPDATE `', table_name, '` SET `id` = UUID() WHERE `id` IS NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    -- Remover PRIMARY KEY existente se houver
    SET @sql = CONCAT('ALTER TABLE `', table_name, '` DROP PRIMARY KEY');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    -- Tornar a coluna NOT NULL e adicionar PRIMARY KEY
    SET @sql = CONCAT('ALTER TABLE `', table_name, '` MODIFY COLUMN `id` CHAR(36) NOT NULL PRIMARY KEY');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- Corrigir todas as tabelas conhecidas com problemas
CALL fix_table_primary_key('partner_links');
CALL fix_table_primary_key('payout_rules');

-- Limpar a procedure após uso
DROP PROCEDURE IF EXISTS fix_table_primary_key;
