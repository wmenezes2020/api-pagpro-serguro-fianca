import { hash } from 'bcrypt';
import { AppDataSource } from './typeorm-data-source';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

async function runSeed() {
  const attempts = Number(process.env.DATABASE_RETRY_ATTEMPTS ?? 5);
  const delayMs = Number(process.env.DATABASE_RETRY_DELAY ?? 2000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await AppDataSource.initialize();
      const userRepository = AppDataSource.getRepository(User);

      const existingAdmin = await userRepository.findOne({
        where: { email: 'admin@pagproseguro.com.br' },
      });

      if (!existingAdmin) {
        const admin = userRepository.create({
          email: 'admin@pagproseguro.com.br',
          passwordHash: await hash('PagPro@2025', 10),
          role: UserRole.ADMIN,
          fullName: 'Administrador PagPro',
          isActive: true,
        });
        await userRepository.save(admin);
        console.log('Usuário administrador criado com sucesso.');
      } else {
        console.log(
          'Usuário administrador já existe. Nenhuma ação necessária.',
        );
      }
      return;
    } catch (error) {
      console.error(
        `Erro ao executar seed (tentativa ${attempt}/${attempts}):`,
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

void runSeed();
