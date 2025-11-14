# Instalação do Banco de Dados - PagPro Seguro Fiança

## Opções de Instalação

### Opção 1: Script SQL Completo (Recomendado para Setup Inicial)

Execute o arquivo `schema.sql` para criar toda a estrutura do banco:

```bash
# Via linha de comando
mysql -u pagpro -p pagpro_db < database/schema.sql

# Ou via MySQL Workbench/phpMyAdmin
# Importe o arquivo database/schema.sql
```

Depois, execute o seed para criar o usuário admin:

```bash
mysql -u pagpro -p pagpro_db < database/seed.sql
```

### Opção 2: TypeORM Migrations (Recomendado para Desenvolvimento)

O projeto usa TypeORM com migrations. Para criar o banco:

```bash
# 1. Certifique-se de que o banco existe
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS pagpro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Execute as migrations (criará todas as tabelas)
npm run db:migrate

# 3. Execute o seed (criará usuário admin)
npm run db:seed
```

### Opção 3: Docker Compose (Mais Fácil)

O `docker-compose.yml` na raiz do projeto já configura tudo:

```bash
# Iniciar apenas o MySQL
docker-compose up -d mysql

# Aguardar MySQL estar pronto (alguns segundos)
# Depois execute as migrations e seed
npm run db:migrate
npm run db:seed
```

## Verificação

Após a instalação, verifique se as tabelas foram criadas:

```sql
USE pagpro_db;
SHOW TABLES;
```

Você deve ver as seguintes tabelas:
- users
- imobiliaria_profiles
- inquilino_profiles
- corretor_profiles
- properties
- rental_applications
- credit_analyses
- insurance_policies
- payment_schedules
- support_tickets
- notifications
- documents

## Credenciais Padrão

Após executar o seed, você terá acesso com:

- **Email:** admin@pagproseguro.com.br
- **Senha:** PagPro@2025

⚠️ **IMPORTANTE:** Altere a senha após o primeiro acesso!

## Troubleshooting

### Erro: "Database doesn't exist"

```bash
mysql -u root -p -e "CREATE DATABASE pagpro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Erro: "Access denied"

Verifique as credenciais no arquivo `.env`:
```env
DATABASE_USER=pagpro
DATABASE_PASSWORD=pagpro
```

### Erro: "Table already exists"

Se as tabelas já existem, você pode:
1. Dropar o banco e recriar: `DROP DATABASE pagpro_db; CREATE DATABASE pagpro_db;`
2. Ou usar migrations do TypeORM que detectam mudanças automaticamente

## Próximos Passos

Após instalar o banco de dados:

1. Configure as variáveis de ambiente no `.env`
2. Execute as migrations: `npm run db:migrate`
3. Execute o seed: `npm run db:seed`
4. Inicie o servidor: `npm run start:dev`

