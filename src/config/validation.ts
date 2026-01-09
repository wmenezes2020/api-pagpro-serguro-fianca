import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().allow('', null),
  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().default(3306),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),
  JWT_ACCESS_TOKEN_SECRET: Joi.string().required(),
  JWT_ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
  JWT_REFRESH_TOKEN_TTL: Joi.string().default('7d'),
  COVERAGE_MULTIPLIER: Joi.number().default(3),
  MONTHLY_PREMIUM_RATE: Joi.number().default(0.15),
  ADHESION_FEE_RATE: Joi.number().default(1),
  AZURE_STORAGE_CONNECTION_STRING: Joi.string().required(),
  AZURE_STORAGE_CONTAINER: Joi.string().default('documents'),
  EMAIL_SERVICE_URL: Joi.string().allow('', null).optional(),
  EMAIL_API_KEY: Joi.string().allow('', null).optional(),
  FRONTEND_URL: Joi.string().default('http://localhost:3001'),
  OPENAI_API_KEY: Joi.string().allow('', null).optional(),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),
  // SMTP Configuration
  SMTP_HOST: Joi.string().allow('', null).optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.string().allow('', null).optional(),
  SMTP_PASSWORD: Joi.string().allow('', null).optional(),
  SMTP_FROM_EMAIL: Joi.string()
    .email()
    .default('noreply@pagproseguro.com.br'),
  SMTP_FROM_NAME: Joi.string().default('PagPro Seguro Fiança'),
  NOTIFICATION_EMAIL_TO: Joi.string().allow('', null).optional(),
  // WhatsApp Configuration
  WHATSAPP_ENABLED: Joi.string().valid('true', 'false').default('false'),
  WHATSAPP_API_URL: Joi.string().allow('', null).optional(),
  WHATSAPP_API_KEY: Joi.string().allow('', null).optional(),
  // Evolution API Configuration
  EVOLUTION_API_URL: Joi.string()
    .default('https://api-whatsapp.edeniva.com.br')
    .allow('', null)
    .optional(),
  EVOLUTION_API_KEY: Joi.string().allow('', null).optional(),
  WHATSAPP_INSTANCE_NAME: Joi.string()
    .default('pagpro-seguro-fianca-default')
    .allow('', null)
    .optional(),
});
