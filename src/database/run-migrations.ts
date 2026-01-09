import { AppDataSource } from './typeorm-data-source';
import { fixEmptyIds } from './fix-empty-ids';

async function runMigrations() {
  const attempts = Number(process.env.DATABASE_RETRY_ATTEMPTS ?? 5);
  const delayMs = Number(process.env.DATABASE_RETRY_DELAY ?? 2000);

  // Passo 1: Corrigir IDs vazios antes de executar migrações
  try {
    console.log('🔧 Corrigindo IDs vazios nas tabelas...');
    await fixEmptyIds();
  } catch (error) {
    console.warn(
      '⚠️  Aviso ao corrigir IDs vazios (pode ser normal se não houver problemas):',
      error?.message ?? error,
    );
    // Continua mesmo se houver erro (pode ser que não haja problemas para corrigir)
  }

  // Passo 2: Executar migrações TypeORM
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await AppDataSource.initialize();
      await AppDataSource.runMigrations();
      console.log('✅ Migrations executadas com sucesso.');
      return;
    } catch (error) {
      console.error(
        `Erro ao executar as migrations (tentativa ${attempt}/${attempts}):`,
        error?.message ?? error,
      );

      if (attempt === attempts) {
        console.error(
          'Não foi possível conectar ao banco após múltiplas tentativas.',
        );
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      try {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
      } catch (cleanupError) {
        console.warn('Falha ao encerrar conexão do DataSource:', cleanupError);
      }
    }
  }
}

void runMigrations();
