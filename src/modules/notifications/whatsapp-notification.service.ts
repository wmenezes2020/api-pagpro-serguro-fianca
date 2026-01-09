import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';
import {
  EvolutionApiService,
  EvolutionInstance,
  EvolutionMessage,
} from './evolution-api.service';

/**
 * Serviço de notificações via WhatsApp usando EvolutionAPI
 */
@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);
  private readonly enabled: boolean;
  private readonly defaultInstanceName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly evolutionApiService: EvolutionApiService,
  ) {
    this.enabled = this.configService.get<string>('app.whatsapp.enabled') === 'true';
    this.defaultInstanceName =
      this.configService.get<string>('app.whatsapp.instanceName') ||
      'pagpro-seguro-fianca-default';

    if (this.enabled) {
      this.logger.log('✅ Serviço de WhatsApp configurado');
    } else {
      this.logger.warn('⚠️ Serviço de WhatsApp desabilitado');
    }
  }

  /**
   * Criar instância WhatsApp para envio de mensagens
   */
  async createDefaultInstance(): Promise<any> {
    const backendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      process.env.BACKEND_URL ||
      'http://localhost:3000';

    const instanceData: EvolutionInstance = {
      instanceName: this.defaultInstanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: `${backendUrl}/api/webhook/whatsapp/${this.defaultInstanceName}`,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT', 'connection.update', 'qrcode.updated'],
      },
      settings: {
        rejectCall: true,
        msgCall: 'Desculpe, não conseguimos atender chamadas. Apenas mensagens.',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        syncFullHistory: false,
        readStatus: false,
      },
    };

    try {
      const response = await this.evolutionApiService.createInstance(instanceData);
      this.logger.log(
        `✅ Instância WhatsApp padrão criada: ${this.defaultInstanceName}`,
      );
      return response;
    } catch (error: any) {
      // Se a instância já existe, apenas retornar sucesso
      if (
        error.response?.status === 409 ||
        error.message?.includes('already exists')
      ) {
        this.logger.log(`ℹ️ Instância ${this.defaultInstanceName} já existe`);
        return { message: 'Instance already exists' };
      }
      throw error;
    }
  }

  /**
   * Obter QR Code da instância padrão
   */
  async getQRCode(): Promise<Buffer> {
    try {
      return await this.evolutionApiService.getQRCode(this.defaultInstanceName);
    } catch (error: any) {
      this.logger.error('❌ Erro ao obter QR Code:', error.message);
      throw error;
    }
  }

  /**
   * Verificar status da instância
   */
  async getInstanceStatus(): Promise<any> {
    try {
      const status = await this.evolutionApiService.getInstanceStatus(
        this.defaultInstanceName,
      );
      return status;
    } catch (error: any) {
      this.logger.error('❌ Erro ao verificar status:', error.message);
      return { state: 'disconnected' };
    }
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('WhatsApp desabilitado. Mensagem não enviada.');
      return;
    }

    try {
      // Verificar se a instância está conectada
      const status = await this.getInstanceStatus();
      const instanceState = status?.state || status?.instance?.state;

      if (instanceState !== 'open' && instanceState !== 'connected') {
        this.logger.warn(
          'Instância do WhatsApp não está conectada. Por favor, escaneie o QR code primeiro.',
        );
        return;
      }

      // Normalizar número de telefone (remover @s.whatsapp.net se existir)
      let cleanPhone = phoneNumber.replace(/\D/g, '');
      // Se não tiver @, adicionar @s.whatsapp.net
      const whatsappNumber = cleanPhone.includes('@')
        ? cleanPhone
        : `${cleanPhone}@s.whatsapp.net`;

      const messageData: EvolutionMessage = {
        number: whatsappNumber,
        text: message,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false,
        },
      };

      await this.evolutionApiService.sendTextMessage(
        this.defaultInstanceName,
        messageData,
      );
      this.logger.log(`✅ WhatsApp enviado para: ${whatsappNumber}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Erro ao enviar WhatsApp: ${error.message}`,
        error.stack,
      );
      // Não lança erro para não quebrar o fluxo principal
    }
  }

  /**
   * Verificar se número existe no WhatsApp
   */
  async checkWhatsAppNumber(phoneNumber: string): Promise<boolean> {
    try {
      return await this.evolutionApiService.checkWhatsAppNumber(
        this.defaultInstanceName,
        phoneNumber,
      );
    } catch (error: any) {
      this.logger.error('❌ Erro ao verificar número WhatsApp:', error.message);
      return false;
    }
  }

  /**
   * Desconectar instância
   */
  async disconnectInstance(): Promise<void> {
    try {
      await this.evolutionApiService.disconnectInstance(this.defaultInstanceName);
      this.logger.log(`✅ Instância ${this.defaultInstanceName} desconectada`);
    } catch (error: any) {
      this.logger.error('❌ Erro ao desconectar instância:', error.message);
      throw error;
    }
  }

  /**
   * Remover instância
   */
  async removeInstance(): Promise<void> {
    try {
      await this.evolutionApiService.removeInstance(this.defaultInstanceName);
      this.logger.log(`✅ Instância ${this.defaultInstanceName} removida`);
    } catch (error: any) {
      // Ignorar erro 404 (instância já não existe)
      if (error.response?.status !== 404) {
        this.logger.error('❌ Erro ao remover instância:', error.message);
        throw error;
      }
    }
  }

  async sendPaymentNotification(
    user: User,
    payment: {
      amount: number;
      dueDate: Date;
      paymentMethod: string;
      barcode?: string;
      qrCode?: string;
    },
  ): Promise<void> {
    if (!user.phone) {
      this.logger.warn(`Usuário ${user.email} não tem telefone cadastrado.`);
      return;
    }

    const amount = Number(payment.amount).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const dueDate = new Date(payment.dueDate).toLocaleDateString('pt-BR');

    let message = `🏦 *PagPro Seguro Fiança*\n\n`;
    message += `Olá ${user.fullName || 'Cliente'},\n\n`;
    message += `Uma nova cobrança foi gerada:\n\n`;
    message += `💰 Valor: ${amount}\n`;
    message += `📅 Vencimento: ${dueDate}\n`;
    message += `💳 Método: ${payment.paymentMethod === 'BOLETO' ? 'Boleto Bancário' : 'PIX'}\n\n`;

    if (payment.paymentMethod === 'BOLETO' && payment.barcode) {
      message += `📄 Código de barras: ${payment.barcode}\n\n`;
      message += `Acesse o portal para visualizar o boleto completo.`;
    } else if (payment.paymentMethod === 'PIX' && payment.qrCode) {
      message += `📱 PIX Copia e Cola:\n${payment.qrCode}\n\n`;
      message += `Acesse o portal para visualizar o QR Code.`;
    }

    message += `\n\nObrigado por escolher PagPro!`;

    await this.sendMessage(user.phone, message);
  }
}
