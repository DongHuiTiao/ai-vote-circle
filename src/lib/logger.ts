/**
 * 应用程序日志配置
 *
 * 使用简单的日志包装器，自动处理：
 * - 开发环境：彩色输出，详细日志
 * - 生产环境：结构化日志
 * - 自动时间戳和上下文
 */

type LogLevel = 'info' | 'warn' | 'error';

class Logger {
  constructor(private context: string) {}

  private log(level: LogLevel, message: string, meta?: Record<string, any>) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta,
    };

    // 开发环境：彩色输出
    if (process.env.NODE_ENV === 'development') {
      const colors = {
        info: '\x1b[36m', // 绿色
        warn: '\x1b[33m', // 黄色
        error: '\x1b[31m', // 红色
      };
      const color = colors[level];
      const reset = '\x1b[0m';

      console.log(
        `${color}[${this.context}] ${level.toUpperCase()}: ${message}${reset}`,
        meta && Object.keys(meta).length > 0 ? meta : ''
      );
      if (meta && Object.keys(meta).length > 0) {
        console.log('  ', meta);
      }
    } else {
      // 生产环境：JSON 输出（Vercel 会收集）
      console.log(JSON.stringify(logData));
    }
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log('error', message, meta);
  }
}

// 通用日志
export const logger = new Logger('app');

// API 路由日志
export const apiLogger = new Logger('api');

// 数据库日志
export const dbLogger = new Logger('db');

// 认证日志
export const authLogger = new Logger('auth');

// Worker 日志
export const workerLogger = new Logger('worker');
