import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export const ALLOWED_SETTING_KEYS = [
  'businessName',
  'businessPhone',
  'businessWhatsapp',
  'businessAddress',
  'currency',
  'taxRate',
  'lowStockThreshold',
  'receiptFooter',
] as const;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany({ orderBy: { key: 'asc' } });
    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async update(payload: Record<string, unknown>): Promise<Record<string, string>> {
    const entries = Object.entries(payload ?? {}).filter(
      ([, value]) => typeof value === 'string',
    );

    if (entries.length === 0) {
      throw new BadRequestException('No se recibieron ajustes válidos para actualizar');
    }

    for (const [key, value] of entries) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    return this.getAll();
  }
}
