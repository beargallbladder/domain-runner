export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private level: LogLevel;
  private name: string;

  constructor(name: string, level: LogLevel = LogLevel.INFO) {
    this.name = name;
    this.level = level;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    };
    this.log(LogLevel.ERROR, message, errorContext);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const logData = {
      timestamp,
      level: levelName,
      logger: this.name,
      message,
      ...context
    };

    const logString = JSON.stringify(logData);

    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }
  }

  child(name: string): Logger {
    return new Logger(`${this.name}.${name}`, this.level);
  }
}