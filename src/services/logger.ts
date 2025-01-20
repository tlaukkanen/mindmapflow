// Logging levels
enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
}

// Logger configuration interface
interface LoggerConfig {
  level: LogLevel;
  enableConsole?: boolean;
  // Add other config options as needed (e.g., remote logging endpoint)
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = {
      enableConsole: true,
      ...config,
    };
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;

    // Console logging (development)
    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.ERROR:
          // eslint-disable-next-line no-console
          console.error(logMessage, ...args);
          break;
        case LogLevel.WARN:
          // eslint-disable-next-line no-console
          console.warn(logMessage, ...args);
          break;
        case LogLevel.INFO:
          // eslint-disable-next-line no-console
          console.info(logMessage, ...args);
          break;
        case LogLevel.DEBUG:
          // eslint-disable-next-line no-console
          console.debug(logMessage, ...args);
          break;
      }
    }

    // Add additional logging handlers here (e.g., remote logging)
  }
}

// Create singleton instance
export const logger = new Logger({
  level:
    process.env.NODE_ENV === "production" ? LogLevel.ERROR : LogLevel.DEBUG,
});
