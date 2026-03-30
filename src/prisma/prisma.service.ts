import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('Conectando a la base de datos...');
    try {
      await this.$connect();
      this.logger.log('Conexión a la base de datos establecida');
    } catch (error) {
      this.logger.error('Error al conectar a la base de datos', error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Cerrando conexión a la base de datos...');
    try {
      await this.$disconnect();
      this.logger.log('Conexión a la base de datos cerrada');
    } catch (error) {
      this.logger.error('Error al cerrar conexión', error.stack);
    }
  }
}
