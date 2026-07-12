import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_roles } from '@prisma/client';
import { BufferedLogger } from './logger.service';
import { DatabaseService } from '../database/database.service';

@Controller('admin/health')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(user_roles.admin)
export class HealthController {
  constructor(private readonly db: DatabaseService) { }

  @Get()
  async getHealth() {
    // DB ping
    let dbStatus = 'ok';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await this.db.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (e) {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();

    return {
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        latency: dbLatency,
      },
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      logs: BufferedLogger.getLogs(),
    };
  }

  @Delete('logs')
  clearLogs() {
    BufferedLogger.clear();
    return { message: 'Logs cleared.' };
  }
}
