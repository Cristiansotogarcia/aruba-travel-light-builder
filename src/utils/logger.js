/**
 * Enhanced logging utility with multiple levels and external service integration
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (LogLevel = {}));
class Logger {
    constructor(config = {}) {
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logStorage", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "sessionId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "userId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
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
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    setupErrorHandlers() {
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
    setUserId(userId) {
        this.userId = userId;
    }
    clearUserId() {
        this.userId = undefined;
    }
    shouldLog(level) {
        return level >= this.config.level;
    }
    createLogEntry(level, message, data, context) {
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
    log(level, message, data, context) {
        if (!this.shouldLog(level))
            return;
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
    logToConsole(entry) {
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
    logToStorage(entry) {
        this.logStorage.push(entry);
        // Maintain storage size limit
        if (this.logStorage.length > this.config.maxStorageEntries) {
            this.logStorage = this.logStorage.slice(-this.config.maxStorageEntries);
        }
        // Persist to localStorage for debugging
        try {
            const recentLogs = this.logStorage.slice(-100); // Keep last 100 entries
            localStorage.setItem('app_logs', JSON.stringify(recentLogs));
        }
        catch (error) {
            // localStorage might be full or unavailable
            console.warn('Failed to persist logs to localStorage:', error);
        }
    }
    async logToRemote(entry) {
        if (!this.config.remoteEndpoint)
            return;
        try {
            await fetch(this.config.remoteEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(entry)
            });
        }
        catch (error) {
            // Silently fail remote logging to avoid infinite loops
            console.warn('Failed to send log to remote endpoint:', error);
        }
    }
    // Public logging methods
    debug(message, data, context) {
        this.log(LogLevel.DEBUG, message, data, context);
    }
    info(message, data, context) {
        this.log(LogLevel.INFO, message, data, context);
    }
    warn(message, data, context) {
        this.log(LogLevel.WARN, message, data, context);
    }
    error(message, data, context) {
        this.log(LogLevel.ERROR, message, data, context);
    }
    // Performance logging
    time(label) {
        console.time(label);
        this.debug(`Timer started: ${label}`);
    }
    timeEnd(label) {
        console.timeEnd(label);
        this.debug(`Timer ended: ${label}`);
    }
    // Group logging
    group(label) {
        console.group(label);
        this.debug(`Group started: ${label}`);
    }
    groupEnd() {
        console.groupEnd();
        this.debug('Group ended');
    }
    // Utility methods
    getLogs(level) {
        if (level !== undefined) {
            return this.logStorage.filter(entry => entry.level >= level);
        }
        return [...this.logStorage];
    }
    clearLogs() {
        this.logStorage = [];
        localStorage.removeItem('app_logs');
        this.info('Logs cleared');
    }
    exportLogs() {
        return JSON.stringify(this.logStorage, null, 2);
    }
    getLogStats() {
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
    setLevel(level) {
        this.config.level = level;
        this.info(`Log level changed to ${LogLevel[level]}`);
    }
    setRemoteEndpoint(endpoint) {
        this.config.remoteEndpoint = endpoint;
        this.config.enableRemote = true;
        this.info('Remote logging endpoint configured');
    }
    disableRemoteLogging() {
        this.config.enableRemote = false;
        this.info('Remote logging disabled');
    }
}
// Create and export singleton instance
export const logger = new Logger();
// Export types and enums for external use
export { LogLevel };
// Export default instance
export default logger;
// Development helpers
if (import.meta.env.DEV) {
    // Make logger available globally for debugging
    window.logger = logger;
    // Log application start
    logger.info('Application started', {
        environment: import.meta.env.MODE,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    });
}
