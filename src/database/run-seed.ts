import { hash } from 'bcrypt';
import { AppDataSource } from './typeorm-data-source';
import { User } from '../modules/users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

async function runSeed() {
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
      console.log('Usuário administrador já existe. Nenhuma ação necessária.');
    }
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

void runSeed();
