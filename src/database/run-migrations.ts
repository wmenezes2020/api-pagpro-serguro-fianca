import { AppDataSource } from './typeorm-data-source';
import { fixEmptyIds } from './fix-empty-ids';

async function runMigrations() {
  const startTime = Date.now();
  const attempts = Number(process.env.DATABASE_RETRY_ATTEMPTS ?? 5);
  const delayMs = Number(process.env.DATABASE_RETRY_DELAY ?? 2000);
  const migrationId = `mig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${migrationId}] 🚀 Iniciando processo de migração...`);

  // Passo 1: Corrigir IDs vazios antes de executar migrações
  try {
    console.log(`[${migrationId}] 🔧 Corrigindo IDs vazios nas tabelas...`);
    const fixStartTime = Date.now();
    await fixEmptyIds();
    const fixDuration = Date.now() - fixStartTime;
    console.log(
      `[${migrationId}] ✅ Correção de IDs vazios concluída (${fixDuration}ms)`,
    );
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || 'UNKNOWN';
    console.warn(
      `[${migrationId}] ⚠️  Aviso ao corrigir IDs vazios (pode ser normal se não houver problemas):`,
      {
        message: errorMessage,
        code: errorCode,
        stack: error?.stack || 'No stack trace',
      },
    );
    // Continua mesmo se houver erro (pode ser que não haja problemas para corrigir)
    // Não lança exceção para evitar reinicialização
  }

  // Passo 2: Executar migrações TypeORM
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const attemptStartTime = Date.now();
    try {
      console.log(
        `[${migrationId}] 🔄 Tentativa ${attempt}/${attempts}: Inicializando DataSource...`,
      );
      
      await AppDataSource.initialize();
      console.log(
        `[${migrationId}] ✅ DataSource inicializado (${Date.now() - attemptStartTime}ms)`,
      );

      console.log(`[${migrationId}] 🔄 Executando migrations...`);
      const migrationsStartTime = Date.now();
      const migrations = await AppDataSource.runMigrations();
      const migrationsDuration = Date.now() - migrationsStartTime;
      
      console.log(
        `[${migrationId}] ✅ ${migrations.length} migration(s) executada(s) com sucesso (${migrationsDuration}ms)`,
      );
      
      const totalDuration = Date.now() - startTime;
      console.log(
        `[${migrationId}] ✅ Processo de migração concluído com sucesso (${totalDuration}ms)`,
      );
      
      return;
    } catch (error: any) {
      lastError = error;
      const attemptDuration = Date.now() - attemptStartTime;
      const errorMessage = error?.message || String(error);
      const errorCode = error?.code || 'UNKNOWN';
      const errorStack = error?.stack || 'No stack trace available';

      console.error(
        `[${migrationId}] ❌ Erro ao executar migrations (tentativa ${attempt}/${attempts}, ${attemptDuration}ms):`,
        {
          message: errorMessage,
          code: errorCode,
          sql: error?.sql ? error.sql.substring(0, 200) : null,
          stack: errorStack,
        },
      );

      if (attempt === attempts) {
        const totalDuration = Date.now() - startTime;
        console.error(
          `[${migrationId}] ❌ Não foi possível executar migrations após ${attempts} tentativa(s) (${totalDuration}ms)`,
        );
        console.error(`[${migrationId}] Último erro:`, {
          message: lastError?.message,
          code: (lastError as any)?.code,
          stack: lastError?.stack,
        });
        // Não fazer exit(1) para evitar reinicialização em loop
        // A aplicação pode tentar novamente na próxima inicialização
        console.warn(
          `[${migrationId}] ⚠️  Continuando inicialização da aplicação apesar do erro de migração`,
        );
        return;
      }

      console.log(
        `[${migrationId}] ⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } finally {
      try {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          console.log(`[${migrationId}] ✅ DataSource encerrado`);
        }
      } catch (cleanupError: any) {
        console.warn(
          `[${migrationId}] ⚠️  Falha ao encerrar conexão do DataSource:`,
          cleanupError?.message || cleanupError,
        );
        // Não lança exceção para evitar reinicialização
      }
    }
  }
}

void runMigrations();
