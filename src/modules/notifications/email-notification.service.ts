import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../users/entities/user.entity';
import { NotificationType } from '../../common/enums/notification-type.enum';

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly toEmails: string[];
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Configurar SMTP
    const smtpHost = this.configService.get<string>('app.smtp.host');
    const smtpPort = this.configService.get<number>('app.smtp.port');
    const smtpSecure = this.configService.get<boolean>('app.smtp.secure');
    const smtpUser = this.configService.get<string>('app.smtp.user');
    const smtpPassword = this.configService.get<string>('app.smtp.password');

    this.fromEmail =
      this.configService.get<string>('app.smtp.fromEmail') ||
      'noreply@pagproseguro.com.br';
    this.fromName =
      this.configService.get<string>('app.smtp.fromName') ||
      'PagPro Seguro Fiança';
    this.frontendUrl =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:3000';

    // Obter emails de destino
    const notificationEmailTo = this.configService.get<string>(
      'app.notification.emailTo',
    );
    this.toEmails = notificationEmailTo
      ? notificationEmailTo.split(',').map((email) => email.trim()).filter(Boolean)
      : [];

    if (smtpHost && smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpSecure || false,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      this.logger.log('✅ Serviço de e-mail configurado com sucesso');
    } else {
      this.logger.warn(
        '⚠️ Configuração SMTP incompleta. Emails não serão enviados.',
      );
    }
  }

  /**
   * Envia email genérico
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('⚠️ Transporter SMTP não configurado. Email não enviado.');
      return;
    }

    try {
      const recipients = Array.isArray(to) ? to : [to];

      await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: recipients.join(', '),
        subject,
        html,
      });

      this.logger.log(`✅ Email enviado para: ${recipients.join(', ')}`);
    } catch (error: any) {
      this.logger.error(`❌ Erro ao enviar email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Envia notificação por e-mail para um usuário
   */
  async sendNotificationEmail(
    user: User,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const emailTo = user.email;
    if (!emailTo) {
      this.logger.warn(`⚠️ Usuário ${user.id} não possui email configurado`);
      return;
    }

    const subject = `[PagPro] ${title}`;
    const html = this.getNotificationTemplate({
      userName: user.fullName || user.email,
      notificationTitle: title,
      notificationMessage: message,
      notificationType: type,
      metadata,
      timestamp: this.formatTimestamp(new Date()),
      dashboardUrl: this.frontendUrl,
    });

    await this.sendEmail(emailTo, subject, html);
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(
    user: User,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${resetToken}`;
    const subject = '[PagPro] Recuperação de Senha';
    const html = this.getPasswordResetTemplate({
      userName: user.fullName || user.email,
      resetUrl,
      timestamp: this.formatTimestamp(new Date()),
    });

    await this.sendEmail(user.email, subject, html);
  }

  /**
   * Envia email de boas-vindas
   */
  async sendWelcomeEmail(user: User): Promise<void> {
    const subject = '[PagPro] Bem-vindo ao PagPro Seguro Fiança';
    const html = this.getWelcomeTemplate({
      userName: user.fullName || user.email,
      userEmail: user.email,
      dashboardUrl: this.frontendUrl,
      timestamp: this.formatTimestamp(new Date()),
    });

    await this.sendEmail(user.email, subject, html);
  }

  /**
   * Template genérico para notificações
   */
  private getNotificationTemplate(data: {
    userName: string;
    notificationTitle: string;
    notificationMessage: string;
    notificationType: NotificationType;
    metadata?: Record<string, unknown>;
    timestamp: string;
    dashboardUrl: string;
  }): string {
    // Mapear tipos de notificação para cores e labels
    const getTypeColor = (type: NotificationType): string => {
      const colorMap: Partial<Record<NotificationType, string>> = {
        [NotificationType.APPLICATION_APPROVED]: '#28a745',
        [NotificationType.PAYMENT_RECEIVED]: '#28a745',
        [NotificationType.POLICY_ISSUED]: '#28a745',
        [NotificationType.APPLICATION_REJECTED]: '#dc3545',
        [NotificationType.PAYMENT_OVERDUE]: '#dc3545',
        [NotificationType.PAYMENT_DUE]: '#ffc107',
        [NotificationType.APPLICATION_STATUS_CHANGED]: '#007bff',
        [NotificationType.SUPPORT_TICKET_CREATED]: '#17a2b8',
        [NotificationType.SUPPORT_TICKET_UPDATED]: '#17a2b8',
        [NotificationType.SYSTEM_ANNOUNCEMENT]: '#6f42c1',
      };
      return colorMap[type] || '#007bff';
    };

    const getTypeLabel = (type: NotificationType): string => {
      const labelMap: Partial<Record<NotificationType, string>> = {
        [NotificationType.APPLICATION_APPROVED]: 'Aprovação',
        [NotificationType.APPLICATION_REJECTED]: 'Rejeição',
        [NotificationType.APPLICATION_STATUS_CHANGED]: 'Status Alterado',
        [NotificationType.POLICY_ISSUED]: 'Apólice Emitida',
        [NotificationType.PAYMENT_DUE]: 'Pagamento Pendente',
        [NotificationType.PAYMENT_RECEIVED]: 'Pagamento Recebido',
        [NotificationType.PAYMENT_OVERDUE]: 'Pagamento Atrasado',
        [NotificationType.SUPPORT_TICKET_CREATED]: 'Ticket Criado',
        [NotificationType.SUPPORT_TICKET_UPDATED]: 'Ticket Atualizado',
        [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Anúncio do Sistema',
      };
      return labelMap[type] || 'Notificação';
    };

    const color = getTypeColor(data.notificationType);
    const label = getTypeLabel(data.notificationType);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.notificationTitle}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333333; 
            background-color: #f5f5f5;
        }
        .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
        }
        .header { 
            background: linear-gradient(135deg, ${color} 0%, ${this.darkenColor(color)} 100%);
            color: #ffffff; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 { 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 5px;
        }
        .header p { 
            font-size: 14px; 
            opacity: 0.9;
        }
        .content { 
            padding: 30px 20px; 
            background-color: #ffffff;
        }
        .intro-text {
            font-size: 16px;
            color: #555555;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .message-box { 
            background-color: #f8f9fa; 
            padding: 20px; 
            margin: 20px 0; 
            border-left: 4px solid ${color};
            border-radius: 4px;
        }
        .message-box p {
            color: #212529;
            font-size: 15px;
            line-height: 1.8;
        }
        .type-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            background-color: ${this.lightenColor(color)};
            color: ${color};
        }
        .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: ${color}; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 4px; 
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
        }
        .button:hover {
            opacity: 0.9;
        }
        .footer { 
            text-align: center; 
            padding: 25px 20px; 
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
            color: #6c757d; 
            font-size: 12px;
            line-height: 1.6;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div style="padding: 20px 0;">
        <div class="email-wrapper">
            <div class="header">
                <h1>${data.notificationTitle}</h1>
                <p><span class="type-badge">${label}</span></p>
            </div>
            
            <div class="content">
                <p class="intro-text">
                    Olá, <strong>${data.userName}</strong>,<br><br>
                    Você recebeu uma nova notificação no sistema PagPro Seguro Fiança.
                </p>
                
                <div class="message-box">
                    <p>${data.notificationMessage}</p>
                </div>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${data.dashboardUrl}/dashboard" class="button">Acessar Dashboard</a>
                </p>
                
                <p style="font-size: 14px; color: #6c757d; line-height: 1.8; margin-top: 30px;">
                    Esta é uma mensagem automática do sistema PagPro Seguro Fiança.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>PagPro Seguro Fiança</strong></p>
                <p>Esta é uma mensagem automática de notificação.</p>
                <p>Por favor, não responda este email.</p>
                <p style="margin-top: 15px; font-size: 11px; color: #adb5bd;">
                    © 2025 PagPro Seguro Fiança. Todos os direitos reservados.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Template para recuperação de senha
   */
  private getPasswordResetTemplate(data: {
    userName: string;
    resetUrl: string;
    timestamp: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333333; 
            background-color: #f5f5f5;
        }
        .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
        }
        .header { 
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: #ffffff; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 { 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 5px;
        }
        .content { 
            padding: 30px 20px; 
            background-color: #ffffff;
        }
        .intro-text {
            font-size: 16px;
            color: #555555;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #007bff; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 4px; 
            font-weight: 600;
            font-size: 14px;
            margin: 20px 0;
        }
        .warning-box {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
            font-size: 14px;
        }
        .footer { 
            text-align: center; 
            padding: 25px 20px; 
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
            color: #6c757d; 
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div style="padding: 20px 0;">
        <div class="email-wrapper">
            <div class="header">
                <h1>Recuperação de Senha</h1>
                <p>PagPro Seguro Fiança</p>
            </div>
            
            <div class="content">
                <p class="intro-text">
                    Olá, <strong>${data.userName}</strong>,<br><br>
                    Recebemos uma solicitação para redefinir a senha da sua conta no PagPro Seguro Fiança.
                </p>
                
                <p style="text-align: center;">
                    <a href="${data.resetUrl}" class="button">Redefinir Senha</a>
                </p>
                
                <p style="font-size: 14px; color: #6c757d; text-align: center; margin-top: 20px;">
                    Ou copie e cole este link no seu navegador:<br>
                    <span style="font-family: monospace; font-size: 12px; word-break: break-all;">${data.resetUrl}</span>
                </p>
                
                <div class="warning-box">
                    <strong>⚠️ Importante:</strong> Este link expira em 1 hora. Se você não solicitou a recuperação de senha, ignore este email.
                </div>
            </div>
            
            <div class="footer">
                <p><strong>PagPro Seguro Fiança</strong></p>
                <p>Esta é uma mensagem automática. Por favor, não responda este email.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Template para email de boas-vindas
   */
  private getWelcomeTemplate(data: {
    userName: string;
    userEmail: string;
    dashboardUrl: string;
    timestamp: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao PagPro</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333333; 
            background-color: #f5f5f5;
        }
        .email-wrapper { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
        }
        .header { 
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: #ffffff; 
            padding: 30px 20px; 
            text-align: center;
        }
        .header h1 { 
            font-size: 24px; 
            font-weight: 600; 
            margin-bottom: 5px;
        }
        .content { 
            padding: 30px 20px; 
            background-color: #ffffff;
        }
        .intro-text {
            font-size: 16px;
            color: #555555;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .features-list {
            margin: 20px 0;
        }
        .features-list li {
            padding: 8px 0;
            color: #495057;
        }
        .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #28a745; 
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 4px; 
            font-weight: 600;
            font-size: 14px;
            margin-top: 20px;
        }
        .footer { 
            text-align: center; 
            padding: 25px 20px; 
            background-color: #f8f9fa;
            border-top: 1px solid #dee2e6;
            color: #6c757d; 
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div style="padding: 20px 0;">
        <div class="email-wrapper">
            <div class="header">
                <h1>Bem-vindo ao PagPro Seguro Fiança!</h1>
                <p>Sua conta foi criada com sucesso</p>
            </div>
            
            <div class="content">
                <p class="intro-text">
                    Olá, <strong>${data.userName}</strong>,<br><br>
                    É um prazer tê-lo conosco! Sua conta no PagPro Seguro Fiança foi criada com sucesso.
                </p>
                
                <p style="font-size: 15px; color: #495057; margin-bottom: 15px;">
                    Com o PagPro, você pode:
                </p>
                <ul class="features-list">
                    <li>✅ Gerenciar solicitações de seguro fiança</li>
                    <li>✅ Acompanhar análises de crédito em tempo real</li>
                    <li>✅ Visualizar relatórios e métricas</li>
                    <li>✅ Acessar documentos e histórico completo</li>
                </ul>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="${data.dashboardUrl}/dashboard" class="button">Acessar Dashboard</a>
                </p>
                
                <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
                    Seu email de acesso: <strong>${data.userEmail}</strong>
                </p>
            </div>
            
            <div class="footer">
                <p><strong>PagPro Seguro Fiança</strong></p>
                <p>Estamos aqui para ajudar. Em caso de dúvidas, entre em contato conosco.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Formata timestamp
   */
  private formatTimestamp(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  /**
   * Escurece uma cor hex
   */
  private darkenColor(color: string): string {
    // Implementação simples para escurecer a cor
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const darkenedR = Math.max(0, r - 30).toString(16).padStart(2, '0');
    const darkenedG = Math.max(0, g - 30).toString(16).padStart(2, '0');
    const darkenedB = Math.max(0, b - 30).toString(16).padStart(2, '0');
    return `#${darkenedR}${darkenedG}${darkenedB}`;
  }

  /**
   * Clareia uma cor hex
   */
  private lightenColor(color: string): string {
    // Implementação simples para clarear a cor
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const lightenedR = Math.min(255, r + 50).toString(16).padStart(2, '0');
    const lightenedG = Math.min(255, g + 50).toString(16).padStart(2, '0');
    const lightenedB = Math.min(255, b + 50).toString(16).padStart(2, '0');
    return `#${lightenedR}${lightenedG}${lightenedB}`;
  }
}
