import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { MODEL_NAMES } from './mock/mock-schema';
import { MockDb } from './mock/mock-engine';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly mock: MockDb | null = null;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });

    // DATA_MODE se lee aquí (y no a nivel de módulo) para que ConfigModule
    // haya cargado .env antes de instanciar los providers.
    if (process.env.DATA_MODE === 'mock') {
      this.mock = new MockDb();
      // Shadow every Prisma model delegate with the in-memory implementation
      for (const name of MODEL_NAMES) {
        Object.defineProperty(this, name, {
          value: this.mock.delegate(name),
          enumerable: true,
          configurable: true,
          writable: false,
        });
      }
      Object.defineProperty(this, '$transaction', {
        value: this.mock.$transaction.bind(this.mock),
        configurable: true,
      });
      Object.defineProperty(this, '$queryRaw', {
        value: this.mock.$queryRaw.bind(this.mock),
        configurable: true,
      });
      Object.defineProperty(this, '$connect', {
        value: async () => undefined,
        configurable: true,
      });
      Object.defineProperty(this, '$disconnect', {
        value: async () => undefined,
        configurable: true,
      });
    }
  }

  async onModuleInit() {
    if (this.mock) {
      this.logger.log('✅ Mock DB en memoria cargada con datos de ejemplo (DATA_MODE=mock)');
      return;
    }
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    if (this.mock) return;
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
