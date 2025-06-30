/**
 * Performance monitoring and optimization utilities
 */
/**
 * Performance monitoring class
 */
class PerformanceMonitor {
    constructor() {
        Object.defineProperty(this, "metrics", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "marks", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "observers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.initializeObservers();
    }
    /**
     * Start timing an operation
     */
    startTiming(name, metadata) {
        const mark = {
            name,
            startTime: performance.now(),
            metadata
        };
        this.marks.set(name, mark);
        // Use Performance API if available
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(`${name}-start`);
        }
        console.debug('Performance timing started', { name, metadata });
    }
    /**
     * End timing an operation
     */
    endTiming(name) {
        const mark = this.marks.get(name);
        if (!mark) {
            console.warn('Performance timing not found', { name });
            return null;
        }
        const endTime = performance.now();
        const duration = endTime - mark.startTime;
        mark.endTime = endTime;
        mark.duration = duration;
        // Use Performance API if available
        if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
            performance.mark(`${name}-end`);
            performance.measure(name, `${name}-start`, `${name}-end`);
        }
        // Record as metric
        this.recordMetric({
            name: `timing_${name}`,
            value: duration,
            unit: 'ms',
            timestamp: Date.now(),
            metadata: mark.metadata
        });
        console.debug('Performance timing ended', { name, duration, metadata: mark.metadata });
        return duration;
    }
    /**
     * Record a custom metric
     */
    recordMetric(metric) {
        this.metrics.push(metric);
        // Keep only last 1000 metrics to prevent memory leaks
        if (this.metrics.length > 1000) {
            this.metrics = this.metrics.slice(-1000);
        }
        console.debug('Performance metric recorded', metric);
    }
    /**
     * Get performance report
     */
    getReport(timeRange) {
        let filteredMetrics = this.metrics;
        let filteredMarks = Array.from(this.marks.values());
        if (timeRange) {
            filteredMetrics = this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
            filteredMarks = filteredMarks.filter(m => m.startTime >= timeRange.start && (m.endTime || Date.now()) <= timeRange.end);
        }
        const timingMetrics = filteredMetrics.filter(m => m.name.startsWith('timing_'));
        const totalDuration = timingMetrics.reduce((sum, m) => sum + m.value, 0);
        const averageResponseTime = timingMetrics.length > 0 ? totalDuration / timingMetrics.length : 0;
        const sortedTimings = timingMetrics.sort((a, b) => b.value - a.value);
        const slowestOperation = sortedTimings[0]?.name || 'none';
        const fastestOperation = sortedTimings[sortedTimings.length - 1]?.name || 'none';
        return {
            metrics: filteredMetrics,
            marks: filteredMarks,
            summary: {
                totalDuration,
                averageResponseTime,
                slowestOperation,
                fastestOperation
            }
        };
    }
    /**
     * Clear all performance data
     */
    clear() {
        this.metrics = [];
        this.marks.clear();
        if (typeof performance !== 'undefined' && performance.clearMarks) {
            performance.clearMarks();
            performance.clearMeasures();
        }
        console.info('Performance data cleared');
    }
    /**
     * Initialize performance observers
     */
    initializeObservers() {
        if (typeof PerformanceObserver === 'undefined') {
            return;
        }
        try {
            // Observe navigation timing
            const navObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'navigation') {
                        const navEntry = entry;
                        this.recordNavigationMetrics(navEntry);
                    }
                }
            });
            navObserver.observe({ entryTypes: ['navigation'] });
            this.observers.push(navObserver);
            // Observe resource timing
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'resource') {
                        this.recordResourceMetric(entry);
                    }
                }
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            this.observers.push(resourceObserver);
            // Observe paint timing
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'paint') {
                        this.recordMetric({
                            name: `paint_${entry.name}`,
                            value: entry.startTime,
                            unit: 'ms',
                            timestamp: Date.now()
                        });
                    }
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });
            this.observers.push(paintObserver);
        }
        catch (error) {
            console.warn('Failed to initialize performance observers', error);
        }
    }
    /**
     * Record navigation timing metrics
     */
    recordNavigationMetrics(entry) {
        const metrics = [
            { name: 'dns_lookup', value: entry.domainLookupEnd - entry.domainLookupStart },
            { name: 'tcp_connect', value: entry.connectEnd - entry.connectStart },
            { name: 'request_response', value: entry.responseEnd - entry.requestStart },
            { name: 'dom_processing', value: entry.domComplete - entry.domContentLoadedEventStart },
            { name: 'page_load', value: entry.loadEventEnd - entry.fetchStart }
        ];
        metrics.forEach(metric => {
            if (metric.value >= 0) {
                this.recordMetric({
                    name: `navigation_${metric.name}`,
                    value: metric.value,
                    unit: 'ms',
                    timestamp: Date.now()
                });
            }
        });
    }
    /**
     * Record resource timing metric
     */
    recordResourceMetric(entry) {
        // Only record metrics for significant resources
        if (entry.duration > 10) {
            this.recordMetric({
                name: 'resource_load',
                value: entry.duration,
                unit: 'ms',
                timestamp: Date.now(),
                metadata: {
                    url: entry.name,
                    type: this.getResourceType(entry.name),
                    size: entry.transferSize || 0
                }
            });
        }
    }
    /**
     * Get resource type from URL
     */
    getResourceType(url) {
        if (url.match(/\.(js|jsx|ts|tsx)$/))
            return 'script';
        if (url.match(/\.(css|scss|sass)$/))
            return 'stylesheet';
        if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/))
            return 'image';
        if (url.match(/\.(woff|woff2|ttf|eot)$/))
            return 'font';
        if (url.includes('/api/'))
            return 'api';
        return 'other';
    }
    /**
     * Cleanup observers
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}
/**
 * Performance decorator for functions
 */
export function measurePerformance(name, fn) {
    return ((...args) => {
        performanceMonitor.startTiming(name);
        try {
            const result = fn(...args);
            // Handle async functions
            if (result instanceof Promise) {
                return result.finally(() => {
                    performanceMonitor.endTiming(name);
                });
            }
            performanceMonitor.endTiming(name);
            return result;
        }
        catch (error) {
            performanceMonitor.endTiming(name);
            throw error;
        }
    });
}
/**
 * Performance decorator for async functions
 */
export function measureAsyncPerformance(name, fn) {
    return (async (...args) => {
        performanceMonitor.startTiming(name);
        try {
            const result = await fn(...args);
            performanceMonitor.endTiming(name);
            return result;
        }
        catch (error) {
            performanceMonitor.endTiming(name);
            throw error;
        }
    });
}
/**
 * Debounce function for performance optimization
 */
export function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}
/**
 * Throttle function for performance optimization
 */
export function throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
/**
 * Batch function calls for performance optimization
 */
export function batchCalls(fn, batchSize = 10, delay = 100) {
    let batch = [];
    let timeoutId;
    const processBatch = () => {
        if (batch.length > 0) {
            const currentBatch = [...batch];
            batch = [];
            currentBatch.forEach(args => fn(...args));
        }
    };
    return (...args) => {
        batch.push(args);
        if (batch.length >= batchSize) {
            clearTimeout(timeoutId);
            processBatch();
        }
        else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(processBatch, delay);
        }
    };
}
/**
 * Memory usage monitoring
 */
export const memoryMonitor = {
    /**
     * Get current memory usage
     */
    getUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            return {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
            };
        }
        return null;
    },
    /**
     * Monitor memory usage and warn if high
     */
    monitor() {
        const usage = this.getUsage();
        if (usage && usage.percentage > 80) {
            console.warn('High memory usage detected', {
                percentage: usage.percentage,
                used: Math.round(usage.used / 1024 / 1024),
                total: Math.round(usage.total / 1024 / 1024)
            });
        }
    }
};
/**
 * FPS monitoring for animations
 */
export class FPSMonitor {
    constructor() {
        Object.defineProperty(this, "frames", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        // private lastTime = 0; // Removed unused variable
        Object.defineProperty(this, "isRunning", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // this.lastTime = performance.now(); // Removed unused assignment
        this.tick();
    }
    stop() {
        this.isRunning = false;
    }
    getFPS() {
        if (this.frames.length < 2)
            return 0;
        const now = performance.now();
        const validFrames = this.frames.filter(time => now - time < 1000);
        return validFrames.length;
    }
    tick() {
        if (!this.isRunning)
            return;
        const now = performance.now();
        this.frames.push(now);
        // Keep only last second of frames
        this.frames = this.frames.filter(time => now - time < 1000);
        requestAnimationFrame(() => this.tick());
    }
}
// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
// Utility functions for common performance measurements
export const perf = {
    /**
     * Measure function execution time
     */
    time: (name, fn) => {
        performanceMonitor.startTiming(name);
        try {
            const result = fn();
            performanceMonitor.endTiming(name);
            return result;
        }
        catch (error) {
            performanceMonitor.endTiming(name);
            throw error;
        }
    },
    /**
     * Measure async function execution time
     */
    timeAsync: async (name, fn) => {
        performanceMonitor.startTiming(name);
        try {
            const result = await fn();
            performanceMonitor.endTiming(name);
            return result;
        }
        catch (error) {
            performanceMonitor.endTiming(name);
            throw error;
        }
    },
    /**
     * Record a custom metric
     */
    record: (name, value, unit = 'ms', metadata) => {
        performanceMonitor.recordMetric({
            name,
            value,
            unit,
            timestamp: Date.now(),
            metadata
        });
    },
    /**
     * Get performance report
     */
    getReport: () => performanceMonitor.getReport(),
    /**
     * Clear performance data
     */
    clear: () => performanceMonitor.clear()
};
// Auto-monitor memory usage every 30 seconds
if (typeof window !== 'undefined') {
    setInterval(() => memoryMonitor.monitor(), 30000);
}
