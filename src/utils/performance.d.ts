/**
 * Performance monitoring and optimization utilities
 */
export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    metadata?: Record<string, any>;
}
export interface PerformanceMark {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any>;
}
export interface PerformanceReport {
    metrics: PerformanceMetric[];
    marks: PerformanceMark[];
    summary: {
        totalDuration: number;
        averageResponseTime: number;
        slowestOperation: string;
        fastestOperation: string;
    };
}
/**
 * Performance monitoring class
 */
declare class PerformanceMonitor {
    private metrics;
    private marks;
    private observers;
    constructor();
    /**
     * Start timing an operation
     */
    startTiming(name: string, metadata?: Record<string, any>): void;
    /**
     * End timing an operation
     */
    endTiming(name: string): number | null;
    /**
     * Record a custom metric
     */
    recordMetric(metric: PerformanceMetric): void;
    /**
     * Get performance report
     */
    getReport(timeRange?: {
        start: number;
        end: number;
    }): PerformanceReport;
    /**
     * Clear all performance data
     */
    clear(): void;
    /**
     * Initialize performance observers
     */
    private initializeObservers;
    /**
     * Record navigation timing metrics
     */
    private recordNavigationMetrics;
    /**
     * Record resource timing metric
     */
    private recordResourceMetric;
    /**
     * Get resource type from URL
     */
    private getResourceType;
    /**
     * Cleanup observers
     */
    destroy(): void;
}
/**
 * Performance decorator for functions
 */
export declare function measurePerformance<T extends (...args: any[]) => any>(name: string, fn: T): T;
/**
 * Performance decorator for async functions
 */
export declare function measureAsyncPerformance<T extends (...args: any[]) => Promise<any>>(name: string, fn: T): T;
/**
 * Debounce function for performance optimization
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Throttle function for performance optimization
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Batch function calls for performance optimization
 */
export declare function batchCalls<T extends (...args: any[]) => any>(fn: T, batchSize?: number, delay?: number): (...args: Parameters<T>) => void;
/**
 * Memory usage monitoring
 */
export declare const memoryMonitor: {
    /**
     * Get current memory usage
     */
    getUsage(): {
        used: number;
        total: number;
        percentage: number;
    } | null;
    /**
     * Monitor memory usage and warn if high
     */
    monitor(): void;
};
/**
 * FPS monitoring for animations
 */
export declare class FPSMonitor {
    private frames;
    private isRunning;
    start(): void;
    stop(): void;
    getFPS(): number;
    private tick;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare const perf: {
    /**
     * Measure function execution time
     */
    time: <T>(name: string, fn: () => T) => T;
    /**
     * Measure async function execution time
     */
    timeAsync: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    /**
     * Record a custom metric
     */
    record: (name: string, value: number, unit?: string, metadata?: Record<string, any>) => void;
    /**
     * Get performance report
     */
    getReport: () => PerformanceReport;
    /**
     * Clear performance data
     */
    clear: () => void;
};
export {};
