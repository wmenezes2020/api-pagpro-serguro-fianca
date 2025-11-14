# Banco de Dados - PagPro Seguro Fiança

## Estrutura do Banco de Dados

Este diretório contém os arquivos relacionados ao banco de dados MySQL.

## Arquivos

- **`schema.sql`** - Script SQL completo com toda a estrutura do banco de dados
- **`run-migrations.ts`** - Script para executar migrations do TypeORM
- **`run-seed.ts`** - Script para popular o banco com dados iniciais

## Como Usar

### Opção 1: Usar o Schema SQL Completo

Execute o arquivo `schema.sql` diretamente no MySQL:

```bash
mysql -u pagpro -p pagpro_db < database/schema.sql
```

Ou via MySQL Workbench/phpMyAdmin, importe o arquivo `schema.sql`.

### Opção 2: Usar TypeORM Migrations (Recomendado)

O projeto está configurado para usar TypeORM com migrations. Para criar e executar migrations:

```bash
# Criar uma nova migration
npm run typeorm migration:create -- -n NomeDaMigration

# Executar migrations
npm run db:migrate

# Reverter última migration
npm run typeorm migration:revert
```

### Opção 3: Usar Docker Compose

O `docker-compose.yml` na raiz do projeto já configura o MySQL automaticamente. Basta executar:

```bash
docker-compose up -d mysql
```

## Estrutura das Tabelas

### Tabelas Principais

1. **users** - Usuários do sistema (admin, imobiliária, inquilino, corretor)
2. **imobiliaria_profiles** - Perfis de imobiliárias
3. **inquilino_profiles** - Perfis de inquilinos
4. **corretor_profiles** - Perfis de corretores
5. **properties** - Imóveis cadastrados
6. **rental_applications** - Solicitações de seguro fiança
7. **credit_analyses** - Análises de crédito
8. **insurance_policies** - Apólices de seguro
9. **payment_schedules** - Cronograma de pagamentos
10. **support_tickets** - Tickets de suporte
11. **notifications** - Notificações do sistema
12. **documents** - Documentos armazenados no Azure Blob

### Relacionamentos

- **users** → **imobiliaria_profiles** (1:1)
- **users** → **inquilino_profiles** (1:1)
- **users** → **corretor_profiles** (1:1)
- **users** → **properties** (1:N)
- **users** → **rental_applications** (1:N como applicant ou broker)
- **users** → **support_tickets** (1:N)
- **users** → **notifications** (1:N)
- **users** → **documents** (1:N)
- **properties** → **rental_applications** (1:N)
- **rental_applications** → **credit_analyses** (1:1)
- **rental_applications** → **insurance_policies** (1:1)
- **insurance_policies** → **payment_schedules** (1:N)

## Seed de Dados Iniciais

Para popular o banco com dados iniciais (usuário admin):

```bash
npm run db:seed
```

Isso criará um usuário administrador:
- **Email:** admin@pagproseguro.com.br
- **Senha:** PagPro@2025

## Variáveis de Ambiente

Configure no arquivo `.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=pagpro
DATABASE_PASSWORD=pagpro
DATABASE_NAME=pagpro_db
```

## Backup e Restore

### Backup

```bash
mysqldump -u pagpro -p pagpro_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore

```bash
mysql -u pagpro -p pagpro_db < backup_20250127_120000.sql
```

## Notas Importantes

1. Todas as tabelas usam **UUID (CHAR(36))** como chave primária
2. Os relacionamentos estão configurados com **CASCADE** onde apropriado
3. Os campos JSON são usados para dados flexíveis (amenities, documents, metadata, indicators)
4. Todos os timestamps usam **TIMESTAMP** com valores padrão
5. Os enums estão definidos inline em cada tabela (MySQL não suporta enums reutilizáveis)

