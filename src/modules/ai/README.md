# Sistema de LLMs Dinâmicos e Randômicos

Este módulo implementa um sistema de LLMs (Large Language Models) dinâmicos e randômicos, similar ao utilizado no AcertoAI, permitindo que a análise de documentos seja realizada usando múltiplos provedores de IA de forma automática e distribuída.

## Funcionalidades

- ✅ Seleção aleatória de credenciais de LLM
- ✅ Suporte para múltiplos provedores (Gemini, OpenAI)
- ✅ Fallback automático quando uma credencial atinge limite de taxa (429)
- ✅ Rotação automática entre múltiplas credenciais
- ✅ Estatísticas de uso por credencial
- ✅ Suporte a credenciais globais e por empresa

## Estrutura

```
ai/
├── entities/
│   └── ai-credential.entity.ts      # Entidade de credenciais
├── interfaces/
│   └── llm.interface.ts              # Interfaces e tipos
├── services/
│   ├── ia-credentials.service.ts     # Gerenciamento de credenciais
│   ├── llm-unified.service.ts        # Serviço unificado de LLMs
│   └── llm/
│       ├── gemini-llm.service.ts     # Implementação Gemini
│       ├── openai-llm.service.ts     # Implementação OpenAI
│       └── llm-factory.service.ts    # Factory para criar serviços LLM
├── ai.service.ts                     # Serviço principal de IA
└── ai.module.ts                       # Módulo NestJS
```

## Configuração

### 1. Criar tabela no banco de dados

Execute a migration SQL:
```sql
-- Ver arquivo: src/database/migrations/create-ai-credentials-table.sql
```

### 2. Cadastrar credenciais

Insira credenciais no banco de dados:

```sql
-- Exemplo: Credencial Gemini
INSERT INTO `cliente_psf_ai_credentials` 
  (`name`, `apiKey`, `model`, `llm`, `isActive`, `status`) 
VALUES 
  ('Gemini Principal', 'SUA_CHAVE_GEMINI', 'gemini-2.0-flash-exp', 'gemini', TRUE, 'active');

-- Exemplo: Credencial OpenAI
INSERT INTO `cliente_psf_ai_credentials` 
  (`name`, `apiKey`, `model`, `llm`, `isActive`, `status`) 
VALUES 
  ('OpenAI Principal', 'SUA_CHAVE_OPENAI', 'gpt-4o-mini', 'openai', TRUE, 'active');
```

### 3. Múltiplas credenciais

Para distribuir carga e evitar limites de taxa, cadastre múltiplas credenciais:

```sql
-- Múltiplas credenciais Gemini
INSERT INTO `cliente_psf_ai_credentials` (`name`, `apiKey`, `model`, `llm`, `isActive`, `status`) VALUES
  ('Gemini 1', 'CHAVE_1', 'gemini-2.0-flash-exp', 'gemini', TRUE, 'active'),
  ('Gemini 2', 'CHAVE_2', 'gemini-2.0-flash-exp', 'gemini', TRUE, 'active'),
  ('Gemini 3', 'CHAVE_3', 'gemini-2.0-flash-exp', 'gemini', TRUE, 'active');
```

## Como Funciona

### Seleção Aleatória

O sistema seleciona aleatoriamente uma credencial ativa do banco de dados a cada requisição:

1. Busca credenciais ativas (`isActive = true`)
2. Filtra por tipo de LLM (se especificado)
3. Seleciona aleatoriamente uma credencial
4. Usa a credencial para gerar resposta
5. Atualiza estatísticas de uso

### Fallback Automático

Quando uma credencial retorna erro 429 (rate limit):

1. Sistema detecta o erro 429
2. Marca a credencial como usada nesta tentativa
3. Seleciona uma nova credencial aleatória
4. Tenta novamente (até 5 tentativas)
5. Se todas falharem, faz fallback para outro tipo de LLM (ex: Gemini → OpenAI)

### Rotação de Credenciais

- Cada requisição usa uma credencial diferente (aleatória)
- Distribui carga entre múltiplas credenciais
- Evita atingir limites de taxa rapidamente
- Permite escalar horizontalmente adicionando mais credenciais

## Uso no Código

### Análise de Documentos

O `AIService` agora usa automaticamente o sistema de LLMs dinâmicos:

```typescript
// O método analyzeCreditApplication agora usa LLMs dinâmicos
const scoring = await this.aiService.analyzeCreditApplication(
  application,
  documents,
  companyId // opcional
);
```

### Uso Direto do LLMUnifiedService

```typescript
// Gerar resposta com LLM aleatório
const response = await this.llmUnifiedService.generateResponse(
  prompt,
  companyId, // opcional
  {
    temperature: 0.3,
    maxTokens: 2000
  }
);

// Usar especificamente Gemini (com fallback para OpenAI)
const response = await this.llmUnifiedService.generateGeminiResponse(
  prompt,
  companyId, // opcional
  {
    temperature: 0.3,
    maxTokens: 2000
  }
);
```

## Modelos Suportados

### Gemini
- `gemini-2.0-flash-exp`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

### OpenAI
- `gpt-4o-mini`
- `gpt-4o`
- `gpt-4-turbo`

## Monitoramento

O sistema registra logs detalhados:

- ✅ Qual credencial foi selecionada
- ✅ Qual LLM foi usado
- ✅ Tentativas de fallback
- ✅ Erros e rate limits
- ✅ Estatísticas de uso

## Benefícios

1. **Alta Disponibilidade**: Múltiplas credenciais garantem continuidade mesmo com falhas
2. **Distribuição de Carga**: Evita sobrecarregar uma única credencial
3. **Escalabilidade**: Adicione mais credenciais conforme necessário
4. **Resiliência**: Fallback automático em caso de problemas
5. **Flexibilidade**: Suporte a múltiplos provedores de IA

## Manutenção

### Verificar Status das Credenciais

```sql
SELECT 
  id, 
  name, 
  llm, 
  model, 
  status, 
  isActive, 
  usageCount, 
  errorCount,
  lastUsed
FROM cliente_psf_ai_credentials
ORDER BY usageCount DESC;
```

### Desativar Credencial com Problemas

```sql
UPDATE cliente_psf_ai_credentials 
SET isActive = FALSE, status = 'error' 
WHERE id = ?;
```

### Reativar Credencial

```sql
UPDATE cliente_psf_ai_credentials 
SET isActive = TRUE, status = 'active', errorCount = 0 
WHERE id = ?;
```
