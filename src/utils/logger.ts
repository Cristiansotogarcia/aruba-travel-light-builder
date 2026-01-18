/**
 * Enhanced logging utility with multiple levels and external service integration
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private logStorage: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      enableRemote: import.meta.env.PROD,
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  clearUserId(): void {
    this.userId = undefined;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      userId: this.userId,
      sessionId: this.sessionId
    };
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, data, context);

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }

    // Remote logging
    if (this.config.enableRemote && level >= LogLevel.WARN) {
      this.logToRemote(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${levelName}:`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        if (entry.context) {
          console.error('Context:', entry.context);
        }
        break;
    }
  }

  private logToStorage(entry: LogEntry): void {
    this.logStorage.push(entry);

    // Maintain storage size limit
    if (this.logStorage.length > this.config.maxStorageEntries) {
      this.logStorage = this.logStorage.slice(-this.config.maxStorageEntries);
    }

    // Persist to localStorage for debugging
    try {
      const recentLogs = this.logStorage.slice(-100); // Keep last 100 entries
      localStorage.setItem('app_logs', JSON.stringify(recentLogs));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Failed to persist logs to localStorage:', error);
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Silently fail remote logging to avoid infinite loops
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  // Public logging methods
  debug(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, context);
  }

  // Performance logging
  time(label: string): void {
    console.time(label);
    this.debug(`Timer started: ${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
    this.debug(`Timer ended: ${label}`);
  }

  // Group logging
  group(label: string): void {
    console.group(label);
    this.debug(`Group started: ${label}`);
  }

  groupEnd(): void {
    console.groupEnd();
    this.debug('Group ended');
  }

  // Utility methods
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logStorage.filter(entry => entry.level >= level);
    }
    return [...this.logStorage];
  }

  clearLogs(): void {
    this.logStorage = [];
    localStorage.removeItem('app_logs');
    this.info('Logs cleared');
  }

  exportLogs(): string {
    return JSON.stringify(this.logStorage, null, 2);
  }

  getLogStats(): Record<string, number> {
    const stats = {
      total: this.logStorage.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    this.logStorage.forEach(entry => {
      switch (entry.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
      }
    });

    return stats;
  }

  // Configuration methods
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level changed to ${LogLevel[level]}`);
  }

  setRemoteEndpoint(endpoint: string): void {
    this.config.remoteEndpoint = endpoint;
    this.config.enableRemote = true;
    this.info('Remote logging endpoint configured');
  }

  disableRemoteLogging(): void {
    this.config.enableRemote = false;
    this.info('Remote logging disabled');
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export types and enums for external use
export { LogLevel, type LogEntry, type LoggerConfig };

// Export default instance
export default logger;

// Development helpers
if (import.meta.env.DEV) {
  // Make logger available globally for debugging
  const devWindow = window as Window & { logger?: Logger };
  devWindow.logger = logger;
  
  // Log application start
  logger.info('Application started', {
    environment: import.meta.env.MODE,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  });
}
