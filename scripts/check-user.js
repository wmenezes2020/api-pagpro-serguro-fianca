const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function checkUser() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'root',
    database: process.env.DATABASE_NAME || 'pagpro_db',
  });

  try {
    const email = 'wesleyempresa@gmail.com';
    const password = '@Matrix19';

    console.log(`\nVerificando usuário: ${email}\n`);

    // Buscar usuário
    const [users] = await connection.execute(
      'SELECT * FROM cliente_psf_users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      console.log('❌ Usuário não encontrado no banco de dados!');
      console.log('\nPossíveis causas:');
      console.log('1. O registro não foi concluído com sucesso');
      console.log('2. O email está diferente do que foi cadastrado');
      console.log('\nSolução: Faça um novo registro ou verifique o email cadastrado.');
      return;
    }

    const user = users[0];
    console.log('✅ Usuário encontrado!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Ativo: ${user.isActive ? 'Sim' : 'Não'}`);
    console.log(`   Nome: ${user.fullName || 'Não informado'}`);

    if (!user.isActive) {
      console.log('\n⚠️  Usuário está INATIVO!');
      console.log('   Isso pode ser a causa do erro 401.');
      return;
    }

    // Testar senha
    console.log('\n🔐 Testando senha...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isPasswordValid) {
      console.log('✅ Senha está CORRETA!');
      console.log('\nO problema pode ser:');
      console.log('1. Cache do frontend');
      console.log('2. Problema com a requisição');
      console.log('3. Problema com o token JWT');
    } else {
      console.log('❌ Senha está INCORRETA!');
      console.log('\nA senha fornecida não corresponde à senha cadastrada.');
      console.log('Verifique se está usando a senha correta que foi cadastrada.');
    }

    // Verificar perfil
    if (user.role === 'IMOBILIARIA') {
      const [profiles] = await connection.execute(
        'SELECT * FROM cliente_psf_imobiliaria_profiles WHERE userId = ?',
        [user.id]
      );
      if (profiles.length > 0) {
        console.log('\n✅ Perfil de imobiliária encontrado!');
        console.log(`   Razão Social: ${profiles[0].companyName}`);
        console.log(`   CNPJ: ${profiles[0].cnpj}`);
      } else {
        console.log('\n⚠️  Perfil de imobiliária NÃO encontrado!');
        console.log('   O registro pode estar incompleto.');
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error.message);
  } finally {
    await connection.end();
  }
}

checkUser();

