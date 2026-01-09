import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPartnerLinksPrimaryKey1736371942000
  implements MigrationInterface
{
  /**
   * Função auxiliar para corrigir uma tabela específica
   */
  private async fixTablePrimaryKey(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<void> {
    const tableExists = await queryRunner.hasTable(tableName);
    if (!tableExists) {
      return; // Tabela não existe, não há nada para corrigir
    }

    const table = await queryRunner.getTable(tableName);
    const idColumnExists = table?.findColumnByName('id');

    if (!idColumnExists) {
      // Passo 1: Adicionar coluna id como nullable primeiro
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` 
        ADD COLUMN \`id\` CHAR(36) NULL
      `);
    }

    // Passo 2: Deletar registros com IDs vazios ou inválidos
    await queryRunner.query(`
      DELETE FROM \`${tableName}\` 
      WHERE \`id\` IS NULL OR \`id\` = '' OR TRIM(\`id\`) = ''
    `);

    // Passo 3: Atualizar qualquer registro restante com NULL para ter UUID válido
    await queryRunner.query(`
      UPDATE \`${tableName}\` 
      SET \`id\` = UUID() 
      WHERE \`id\` IS NULL
    `);

    // Passo 4: Remover PRIMARY KEY existente se houver
    try {
      await queryRunner.query(`
        ALTER TABLE \`${tableName}\` DROP PRIMARY KEY
      `);
    } catch (error) {
      // Ignorar erro se não houver PRIMARY KEY
    }

    // Passo 5: Tornar a coluna NOT NULL e adicionar PRIMARY KEY
    await queryRunner.query(`
      ALTER TABLE \`${tableName}\` 
      MODIFY COLUMN \`id\` CHAR(36) NOT NULL PRIMARY KEY
    `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lista de tabelas que podem ter o problema de IDs vazios
    const tablesToFix = [
      'partner_links',
      'payout_rules',
      // Adicione outras tabelas aqui se necessário
    ];

    for (const tableName of tablesToFix) {
      try {
        // Verificar se a tabela existe antes de tentar corrigir
        const tableExists = await queryRunner.hasTable(tableName);
        if (!tableExists) {
          continue; // Pula se a tabela não existir
        }

        await this.fixTablePrimaryKey(queryRunner, tableName);
        console.log(`✅ Tabela ${tableName} corrigida com sucesso`);
      } catch (error) {
        console.error(
          `❌ Erro ao corrigir tabela ${tableName}:`,
          error.message,
        );
        // Continua com as outras tabelas mesmo se uma falhar
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter não é necessário para este caso
    // A migração apenas corrige dados inválidos
  }
}
