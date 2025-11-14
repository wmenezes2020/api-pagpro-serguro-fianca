import { AppDataSource } from './typeorm-data-source';

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    console.log('Migrations executadas com sucesso.');
  } catch (error) {
    console.error('Erro ao executar as migrations:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void runMigrations();
