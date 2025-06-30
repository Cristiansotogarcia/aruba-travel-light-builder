/**
 * Enhanced logging utility with multiple levels and external service integration
 */
declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
interface LogEntry {
    level: LogLevel;
    message: string;
    data?: any;
    timestamp: string;
    context?: Record<string, any>;
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
declare class Logger {
    private config;
    private logStorage;
    private sessionId;
    private userId?;
    constructor(config?: Partial<LoggerConfig>);
    private generateSessionId;
    private setupErrorHandlers;
    setUserId(userId: string): void;
    clearUserId(): void;
    private shouldLog;
    private createLogEntry;
    private log;
    private logToConsole;
    private logToStorage;
    private logToRemote;
    debug(message: string, data?: any, context?: Record<string, any>): void;
    info(message: string, data?: any, context?: Record<string, any>): void;
    warn(message: string, data?: any, context?: Record<string, any>): void;
    error(message: string, data?: any, context?: Record<string, any>): void;
    time(label: string): void;
    timeEnd(label: string): void;
    group(label: string): void;
    groupEnd(): void;
    getLogs(level?: LogLevel): LogEntry[];
    clearLogs(): void;
    exportLogs(): string;
    getLogStats(): Record<string, number>;
    setLevel(level: LogLevel): void;
    setRemoteEndpoint(endpoint: string): void;
    disableRemoteLogging(): void;
}
export declare const logger: Logger;
export { LogLevel, type LogEntry, type LoggerConfig };
export default logger;
