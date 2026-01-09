export interface BoletoData {
  barcode: string;
  digitableLine: string;
  dueDate: Date;
  amount: number;
  pdfUrl?: string;
  externalId: string;
}

export interface PixData {
  qrCode: string;
  qrCodeImageUrl?: string;
  copyPaste: string;
  dueDate: Date;
  amount: number;
  externalId: string;
}

export interface PaymentProvider {
  generateBoleto(
    amount: number,
    dueDate: Date,
    payerInfo: {
      name: string;
      document: string;
      email: string;
      phone?: string;
    },
    description: string,
  ): Promise<BoletoData>;

  generatePix(
    amount: number,
    dueDate: Date,
    payerInfo: {
      name: string;
      document: string;
      email: string;
      phone?: string;
    },
    description: string,
  ): Promise<PixData>;

  checkPaymentStatus(externalId: string): Promise<{
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paidAt?: Date;
  }>;
}
