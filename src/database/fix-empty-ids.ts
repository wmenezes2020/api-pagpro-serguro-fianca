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
    const startTime = Date.now();
    const errors: Array<{ table: string; error: string }> = [];

    for (const tableName of tablesToFix) {
      const tableStartTime = Date.now();
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

        // Verificar se já existe PRIMARY KEY na coluna id
        const [keyInfo] = await connection.execute(
          `SELECT CONSTRAINT_NAME 
           FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = ? 
           AND COLUMN_NAME = 'id' 
           AND CONSTRAINT_NAME = 'PRIMARY'`,
          [tableName],
        );
        const hasPrimaryKey = (keyInfo as any[]).length > 0;

        // Se não tem PRIMARY KEY, precisamos corrigir os dados primeiro
        if (!hasPrimaryKey) {
          // Passo 1: Verificar quantos registros têm IDs vazios ou inválidos
          const [countResult] = await connection.execute(
            `SELECT COUNT(*) as count FROM \`${tableName}\` 
             WHERE \`id\` IS NULL OR \`id\` = '' OR TRIM(\`id\`) = ''`,
          );
          const invalidCount = (countResult as any[])[0]?.count || 0;

          if (invalidCount > 0) {
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
          }

          // Passo 2: Atualizar registros restantes com NULL para ter UUID válido
          const [updateResult] = await connection.execute(
            `UPDATE \`${tableName}\` SET \`id\` = UUID() WHERE \`id\` IS NULL`,
          );
          const updatedCount = (updateResult as any).affectedRows || 0;
          if (updatedCount > 0) {
            console.log(
              `🔄 ${updatedCount} registro(s) atualizado(s) na tabela ${tableName}`,
            );
          }

          // Passo 3: Verificar se há duplicatas antes de adicionar PRIMARY KEY
          const [duplicateCheck] = await connection.execute(
            `SELECT \`id\`, COUNT(*) as count 
             FROM \`${tableName}\` 
             GROUP BY \`id\` 
             HAVING count > 1`,
          );
          const duplicates = duplicateCheck as any[];
          if (duplicates.length > 0) {
            console.warn(
              `⚠️  Encontradas ${duplicates.length} duplicata(s) na tabela ${tableName}. Corrigindo...`,
            );
            // Atualizar duplicatas com novos UUIDs
            for (const dup of duplicates) {
              await connection.execute(
                `UPDATE \`${tableName}\` 
                 SET \`id\` = UUID() 
                 WHERE \`id\` = ? 
                 LIMIT ?`,
                [dup.id, dup.count - 1],
              );
            }
            console.log(`✅ Duplicatas corrigidas na tabela ${tableName}`);
          }

          // Passo 4: Tornar a coluna NOT NULL e adicionar PRIMARY KEY
          try {
            await connection.execute(
              `ALTER TABLE \`${tableName}\` 
               MODIFY COLUMN \`id\` CHAR(36) NOT NULL PRIMARY KEY`,
            );
            console.log(`✅ PRIMARY KEY adicionada à tabela ${tableName}`);
          } catch (pkError: any) {
            // Se ainda houver erro de duplicação, tentar uma abordagem diferente
            if (pkError.code === 'ER_DUP_ENTRY' || pkError.message.includes('Duplicate entry')) {
              console.warn(
                `⚠️  Erro ao adicionar PRIMARY KEY (possível duplicação). Tentando abordagem alternativa...`,
              );
              // Remover todos os IDs duplicados e regenerar
              await connection.execute(
                `UPDATE \`${tableName}\` SET \`id\` = UUID()`,
              );
              // Tentar novamente
              await connection.execute(
                `ALTER TABLE \`${tableName}\` 
                 MODIFY COLUMN \`id\` CHAR(36) NOT NULL PRIMARY KEY`,
              );
              console.log(`✅ PRIMARY KEY adicionada à tabela ${tableName} (após correção de duplicatas)`);
            } else {
              throw pkError;
            }
          }
        } else {
          // PRIMARY KEY já existe, apenas verificar e corrigir dados inválidos
          const [invalidCheck] = await connection.execute(
            `SELECT COUNT(*) as count FROM \`${tableName}\` 
             WHERE \`id\` IS NULL OR \`id\` = '' OR TRIM(\`id\`) = ''`,
          );
          const invalidCount = (invalidCheck as any[])[0]?.count || 0;
          if (invalidCount > 0) {
            console.warn(
              `⚠️  Encontrados ${invalidCount} registro(s) com IDs inválidos na tabela ${tableName} (com PRIMARY KEY). Deletando...`,
            );
            await connection.execute(
              `DELETE FROM \`${tableName}\` 
               WHERE \`id\` IS NULL OR \`id\` = '' OR TRIM(\`id\`) = ''`,
            );
          }
        }
        const tableDuration = Date.now() - tableStartTime;
        console.log(`✅ Tabela ${tableName} corrigida com sucesso (${tableDuration}ms)`);
      } catch (error: any) {
        const tableDuration = Date.now() - tableStartTime;
        const errorMessage = error?.message || String(error);
        const errorCode = error?.code || 'UNKNOWN';
        const errorStack = error?.stack || 'No stack trace available';
        
        errors.push({ table: tableName, error: errorMessage });
        
        console.error(`❌ Erro ao corrigir tabela ${tableName} (${tableDuration}ms):`, {
          message: errorMessage,
          code: errorCode,
          sql: error?.sql || 'N/A',
          table: tableName,
        });
        
        // Log completo apenas em modo debug ou para erros críticos
        if (errorCode === 'ER_DUP_ENTRY' || errorCode === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.error(`   Stack trace: ${errorStack}`);
        }
        
        // Continua com as outras tabelas mesmo se uma falhar
        // Não lança exceção para evitar reinicialização da aplicação
      }
    }

    const totalDuration = Date.now() - startTime;
    if (errors.length > 0) {
      console.warn(
        `⚠️  Correção de IDs vazios concluída com ${errors.length} erro(s) em ${totalDuration}ms`,
      );
      console.warn('   Erros:', JSON.stringify(errors, null, 2));
    } else {
      console.log(`✅ Correção de IDs vazios concluída com sucesso (${totalDuration}ms)`);
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || 'UNKNOWN';
    console.error('❌ Erro crítico ao executar correção de IDs vazios:', {
      message: errorMessage,
      code: errorCode,
      stack: error?.stack || 'No stack trace available',
    });
    // Não lança exceção para evitar reinicialização da aplicação
    // A aplicação pode continuar mesmo se a correção falhar
  } finally {
    try {
      await connection.end();
    } catch (closeError: any) {
      console.warn('⚠️  Erro ao fechar conexão:', closeError?.message || closeError);
    }
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
