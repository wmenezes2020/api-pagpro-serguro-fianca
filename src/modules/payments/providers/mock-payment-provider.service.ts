import { Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, BoletoData, PixData } from '../interfaces/payment-provider.interface';

/**
 * Mock Payment Provider - Para desenvolvimento e testes
 * Em produção, substitua por integração real (Gerencianet, Asaas, etc.)
 */
@Injectable()
export class MockPaymentProviderService implements PaymentProvider {
  private readonly logger = new Logger(MockPaymentProviderService.name);

  async generateBoleto(
    amount: number,
    dueDate: Date,
    payerInfo: {
      name: string;
      document: string;
      email: string;
      phone?: string;
    },
    description: string,
  ): Promise<BoletoData> {
    this.logger.log(`Gerando boleto mock: R$ ${amount.toFixed(2)} para ${payerInfo.name}`);

    // Gera código de barras mock (formato válido mas não funcional)
    const barcode = this.generateMockBarcode();
    const digitableLine = this.formatDigitableLine(barcode);

    return {
      barcode,
      digitableLine,
      dueDate,
      amount,
      pdfUrl: `https://mock-provider.com/boletos/${barcode}.pdf`,
      externalId: `MOCK_BOLETO_${Date.now()}`,
    };
  }

  async generatePix(
    amount: number,
    dueDate: Date,
    payerInfo: {
      name: string;
      document: string;
      email: string;
      phone?: string;
    },
    description: string,
  ): Promise<PixData> {
    this.logger.log(`Gerando PIX mock: R$ ${amount.toFixed(2)} para ${payerInfo.name}`);

    // Gera QR Code mock (EMV format)
    const qrCode = this.generateMockPixQrCode(amount, payerInfo.name);
    const copyPaste = qrCode;

    return {
      qrCode,
      qrCodeImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`,
      copyPaste,
      dueDate,
      amount,
      externalId: `MOCK_PIX_${Date.now()}`,
    };
  }

  async checkPaymentStatus(externalId: string): Promise<{
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paidAt?: Date;
  }> {
    // Mock: sempre retorna PENDING
    // Em produção, consultaria o provedor real
    return {
      status: 'PENDING',
    };
  }

  private generateMockBarcode(): string {
    // Gera código de barras mock de 44 dígitos
    const random = Math.floor(Math.random() * 1000000000000000000000).toString().padStart(20, '0');
    return `34191${random}${Date.now().toString().slice(-6)}`;
  }

  private formatDigitableLine(barcode: string): string {
    // Formata código de barras em linha digitável (formato padrão brasileiro)
    return `${barcode.slice(0, 5)}.${barcode.slice(5, 10)} ${barcode.slice(10, 15)}.${barcode.slice(15, 21)} ${barcode.slice(21, 26)}.${barcode.slice(26, 32)} ${barcode.slice(32, 33)} ${barcode.slice(33)}`;
  }

  private generateMockPixQrCode(amount: number, name: string): string {
    // Gera QR Code PIX mock no formato EMV
    const txid = `MOCK${Date.now()}`;
    const amountStr = amount.toFixed(2);
    return `00020126580014BR.GOV.BCB.PIX0136${txid}520400005303986540${amountStr}5802BR59${name.substring(0, 25)}6009SAO PAULO62070503***6304`;
  }
}
