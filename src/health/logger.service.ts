import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

export interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
}

@Injectable()
export class BufferedLogger extends ConsoleLogger {
  private static buffer: LogEntry[] = [];
  private static readonly MAX = 500;

  private push(level: string, message: any, context?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context || this.context || '',
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };
    BufferedLogger.buffer.push(entry);
    if (BufferedLogger.buffer.length > BufferedLogger.MAX) {
      BufferedLogger.buffer.shift();
    }
  }

  static getLogs(): LogEntry[] {
    return [...BufferedLogger.buffer];
  }

  static clear() {
    BufferedLogger.buffer = [];
  }

  log(message: any, context?: string) {
    this.push('log', message, context);
    super.log(message, context);
  }

  error(message: any, stack?: string, context?: string) {
    this.push('error', stack ? `${message}\n${stack}` : message, context);
    super.error(message, stack, context);
  }

  warn(message: any, context?: string) {
    this.push('warn', message, context);
    super.warn(message, context);
  }

  debug(message: any, context?: string) {
    this.push('debug', message, context);
    super.debug(message, context);
  }

  verbose(message: any, context?: string) {
    this.push('verbose', message, context);
    super.verbose(message, context);
  }
}
