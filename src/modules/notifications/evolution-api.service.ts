import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EvolutionInstance {
  instanceName: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS' | 'EVOLUTION';
  settings?: {
    rejectCall?: boolean;
    msgCall?: string;
    groupsIgnore?: boolean;
    alwaysOnline?: boolean;
    readMessages?: boolean;
    readStatus?: boolean;
    syncFullHistory?: boolean;
  };
  webhook?: {
    url: string;
    byEvents?: boolean;
    base64?: boolean;
    headers?: Record<string, string>;
    events?: string[];
  };
}

export interface EvolutionMessage {
  number: string;
  text?: string;
  media?: string;
  mediatype?: 'image' | 'audio' | 'video' | 'document';
  mimetype?: string;
  caption?: string;
  fileName?: string;
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording' | 'paused';
    linkPreview?: boolean;
  };
  quoted?: {
    key: {
      id: string;
    };
  };
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    status?: string;
    message: any;
    contextInfo?: any;
    messageType: string;
    messageTimestamp: number;
    instanceId: string;
    source: string;
  };
  destination: string;
  date_time: string;
  sender: string;
  server_url: string;
  apikey: string;
}

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl =
      this.configService.get<string>('app.whatsapp.evolutionApiUrl') ||
      this.configService.get<string>('app.whatsapp.apiUrl') ||
      'https://api-whatsapp.edeniva.com.br';
    this.apiKey =
      this.configService.get<string>('app.whatsapp.evolutionApiKey') ||
      this.configService.get<string>('app.whatsapp.apiKey') ||
      '';

    if (!this.apiKey) {
      this.logger.warn('⚠️ EVOLUTION_API_KEY não configurado no .env');
    }

    // Configurar axios com headers padrão
    this.httpService.axiosRef.defaults.baseURL = this.baseUrl;
    this.httpService.axiosRef.defaults.headers.common['apikey'] = this.apiKey;
    this.httpService.axiosRef.defaults.headers.common['Content-Type'] =
      'application/json';
    this.httpService.axiosRef.defaults.timeout = 30000;
  }

  private getHeaders() {
    return {
      apikey: this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Criar nova instância WhatsApp
   */
  async createInstance(instanceData: EvolutionInstance): Promise<any> {
    try {
      this.logger.log(
        `📱 Criando instância WhatsApp: ${instanceData.instanceName}`,
      );

      const response = await firstValueFrom(
        this.httpService.post('/instance/create', instanceData, {
          headers: this.getHeaders(),
        }),
      );

      this.logger.log(
        `✅ Instância criada com sucesso: ${instanceData.instanceName}`,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao criar instância ${instanceData.instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Listar todas as instâncias
   */
  async getInstances(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('/instance/fetchInstances', {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        '❌ Erro ao listar instâncias:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Consultar status de uma instância específica
   */
  async getInstanceStatus(instanceName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/instance/connectionState/${instanceName}`, {
          headers: this.getHeaders(),
        }),
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { state: 'not_found' };
      }
      this.logger.error(
        `❌ Erro ao consultar status da instância ${instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Obter QR Code da instância
   */
  async getQRCode(instanceName: string): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/instance/connect/${instanceName}`, {
          headers: this.getHeaders(),
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao obter QR Code da instância ${instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Conectar instância
   */
  async connectInstance(instanceName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`/instance/connect/${instanceName}`, {
          headers: this.getHeaders(),
        }),
      );
      this.logger.log(`✅ Instância ${instanceName} conectada`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao conectar instância ${instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Desconectar instância
   */
  async disconnectInstance(instanceName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`/instance/logout/${instanceName}`, {
          headers: this.getHeaders(),
        }),
      );
      this.logger.log(`✅ Instância ${instanceName} desconectada`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao desconectar instância ${instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Enviar mensagem de texto
   */
  async sendTextMessage(
    instanceName: string,
    messageData: EvolutionMessage,
  ): Promise<any> {
    try {
      // Log da requisição para debug
      this.logger.log(
        `📤 Enviando mensagem para ${messageData.number} via instância ${instanceName}`,
      );
      this.logger.debug(
        `📝 Dados da mensagem: ${JSON.stringify({
          number: messageData.number,
          textLength: messageData.text?.length || 0,
          hasOptions: !!messageData.options,
        })}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(
          `/message/sendText/${instanceName}`,
          messageData,
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(
        `✅ Mensagem de texto enviada para ${messageData.number}`,
      );
      return response.data;
    } catch (error: any) {
      // Log detalhado do erro
      const errorDetails = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        requestData: {
          number: messageData.number,
          textLength: messageData.text?.length || 0,
        },
      };

      this.logger.error(
        `❌ Erro ao enviar mensagem de texto para ${messageData.number}: ${JSON.stringify(errorDetails)}`,
      );

      // Se houver mensagem de erro específica da API, usar ela
      if (error.response?.data?.message) {
        const apiMessage = Array.isArray(error.response.data.message)
          ? error.response.data.message.join(', ')
          : error.response.data.message;
        throw new Error(apiMessage);
      }

      throw error;
    }
  }

  /**
   * Enviar mensagem de mídia
   */
  async sendMediaMessage(
    instanceName: string,
    messageData: EvolutionMessage,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `/message/sendMedia/${instanceName}`,
          messageData,
          {
            headers: this.getHeaders(),
          },
        ),
      );
      this.logger.log(
        `✅ Mensagem de mídia ${messageData.mediatype} enviada para ${messageData.number}`,
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao enviar mensagem de mídia para ${messageData.number}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Remover instância
   */
  async removeInstance(instanceName: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete(`/instance/delete/${instanceName}`, {
          headers: this.getHeaders(),
        }),
      );
      this.logger.log(`✅ Instância ${instanceName} removida com sucesso`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logger.log(
          `ℹ️ Instância ${instanceName} já não existe na Evolution API`,
        );
        return { message: 'Instance not found (already deleted)' };
      }
      this.logger.error(
        `❌ Erro ao remover instância ${instanceName}:`,
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  /**
   * Verificar se número existe no WhatsApp
   * Usa POST ao invés de GET (padrão Evolution API)
   */
  async checkWhatsAppNumber(
    instanceName: string,
    phoneNumber: string,
  ): Promise<boolean> {
    try {
      // Remover @s.whatsapp.net se existir para validação
      const cleanNumber = phoneNumber.replace(/@s\.whatsapp\.net/gi, '');

      const response = await firstValueFrom(
        this.httpService.post(
          `/chat/whatsappNumbers/${instanceName}`,
          {
            numbers: [cleanNumber],
          },
          {
            headers: this.getHeaders(),
          },
        ),
      );

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const numberData = response.data[0];
        return numberData.exists === true;
      }

      return false;
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao verificar número WhatsApp ${phoneNumber}:`,
        error.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Processar webhook recebido
   */
  processWebhookPayload(payload: EvolutionWebhookPayload): EvolutionWebhookPayload {
    this.logger.log(
      `📨 Processando webhook: ${payload.data.key.id} de ${payload.data.key.remoteJid}`,
    );
    return payload;
  }
}
