import { DataSource } from 'typeorm';
import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: process.env.ENV_FILE ?? '.env' });

/**
 * Script para corrigir tabelas com IDs vazios antes do TypeORM sincronizar
 * Este script deve ser executado antes da inicialização do TypeORM
 */
async function fixEmptyIds() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '3306', 10),
    user: process.env.DATABASE_USER ?? 'root',
    password: process.env.DATABASE_PASSWORD ?? 'root',
    database: process.env.DATABASE_NAME ?? 'pagpro',
    multipleStatements: true,
  });

  try {
    const tablesToFix = ['partner_links', 'payout_rules'];

    for (const tableName of tablesToFix) {
      try {
        // Verificar se a tabela existe
        const [tables] = await connection.execute(
          `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
          [tableName],
        );

        const tableExists = (tables as any[])[0]?.count > 0;
        if (!tableExists) {
          console.log(`⏭️  Tabela ${tableName} não existe, pulando...`);
          continue;
        }

        // Verificar se a coluna id existe
        const [columns] = await connection.execute(
          `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'id'`,
          [tableName],
        );

        const columnExists = (columns as any[])[0]?.count > 0;

        if (!columnExists) {
          // Adicionar coluna id como nullable primeiro
          await connection.execute(
            `ALTER TABLE \`${tableName}\` ADD COLUMN \`id\` CHAR(36) NULL`,
          );
          console.log(`✅ Coluna id adicionada à tabela ${tableName}`);
        }

        // Deletar registros com IDs vazios ou inválidos
        const [deleteResult] = await connection.execute(
          `DELETE FROM \`${tableName}\` 
           WHERE \`id\` IS NULL OR \`id\` = '' OR TRIM(\`id\`) = ''`,
        );
        const deletedCount = (deleteResult as any).affectedRows || 0;
        if (deletedCount > 0) {
          console.log(
            `🗑️  ${deletedCount} registro(s) deletado(s) da tabela ${tableName}`,
          );
        }

        // Atualizar registros restantes com NULL para ter UUID válido
        const [updateResult] = await connection.execute(
          `UPDATE \`${tableName}\` SET \`id\` = UUID() WHERE \`id\` IS NULL`,
        );
        const updatedCount = (updateResult as any).affectedRows || 0;
        if (updatedCount > 0) {
          console.log(
            `🔄 ${updatedCount} registro(s) atualizado(s) na tabela ${tableName}`,
          );
        }

        // Remover PRIMARY KEY existente se houver
        try {
          await connection.execute(
            `ALTER TABLE \`${tableName}\` DROP PRIMARY KEY`,
          );
        } catch (error: any) {
          // Ignorar se não houver PRIMARY KEY
          if (!error.message.includes('PRIMARY')) {
            throw error;
          }
        }

        // Tornar a coluna NOT NULL e adicionar PRIMARY KEY
        await connection.execute(
          `ALTER TABLE \`${tableName}\` 
           MODIFY COLUMN \`id\` CHAR(36) NOT NULL PRIMARY KEY`,
        );
        console.log(`✅ Tabela ${tableName} corrigida com sucesso`);
      } catch (error: any) {
        console.error(`❌ Erro ao corrigir tabela ${tableName}:`, error.message);
        // Continua com as outras tabelas mesmo se uma falhar
      }
    }

    console.log('✅ Correção de IDs vazios concluída');
  } finally {
    await connection.end();
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  fixEmptyIds()
    .then(() => {
      console.log('Script de correção executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar script de correção:', error);
      process.exit(1);
    });
}

export { fixEmptyIds };
