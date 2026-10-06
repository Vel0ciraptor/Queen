import { Injectable, NotFoundException } from '@nestjs/common';
import * as QRCodeLib from 'qrcode';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class QrService {
  constructor(private readonly prisma: PrismaService) {}

  async generateProductQr(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { qrCode: true },
    });

    if (!product) {
      throw new NotFoundException(`Producto ${productId} no encontrado`);
    }

    const code = product.qrCode?.code || `QS-${product.sku}`;

    // Generate QR Data URL
    const qrDataUrl = await QRCodeLib.toDataURL(code, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });

    // Update or create QR record
    await this.prisma.qRCode.upsert({
      where: { productId },
      create: {
        productId,
        code,
        imageUrl: qrDataUrl,
      },
      update: {
        imageUrl: qrDataUrl,
      },
    });

    return {
      productId,
      code,
      qrDataUrl,
    };
  }

  async scanCode(code: string) {
    const qrRecord = await this.prisma.qRCode.findUnique({
      where: { code },
      include: {
        product: {
          include: {
            category: true,
            inventory: true,
            images: true,
          },
        },
      },
    });

    if (!qrRecord) {
      // Fallback search by SKU
      const productBySku = await this.prisma.product.findUnique({
        where: { sku: code },
        include: {
          category: true,
          inventory: true,
          images: true,
          qrCode: true,
        },
      });

      if (!productBySku) {
        throw new NotFoundException(`Código o SKU '${code}' no encontrado`);
      }

      return {
        code,
        product: productBySku,
      };
    }

    return {
      code,
      product: qrRecord.product,
    };
  }

  async batchGenerateQrCodes() {
    const products = await this.prisma.product.findMany({
      include: { qrCode: true },
    });

    const results = [];
    for (const product of products) {
      const res = await this.generateProductQr(product.id);
      results.push(res);
    }

    return results;
  }
}
