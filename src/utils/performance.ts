/**
 * Performance monitoring and optimization utilities
 */

// Logger will be added when available

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
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
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, PerformanceMark> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  /**
   * Start timing an operation
   */
  startTiming(name: string, metadata?: Record<string, unknown>): void {
    const mark: PerformanceMark = {
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
  endTiming(name: string): number | null {
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
  recordMetric(metric: PerformanceMetric): void {
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
  getReport(timeRange?: { start: number; end: number }): PerformanceReport {
    let filteredMetrics = this.metrics;
    let filteredMarks = Array.from(this.marks.values());

    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
      filteredMarks = filteredMarks.filter(
        m => m.startTime >= timeRange.start && (m.endTime || Date.now()) <= timeRange.end
      );
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
  clear(): void {
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
  private initializeObservers(): void {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
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
            this.recordResourceMetric(entry as PerformanceResourceTiming);
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

    } catch (error) {
      console.warn('Failed to initialize performance observers', error);
    }
  }

  /**
   * Record navigation timing metrics
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
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
  private recordResourceMetric(entry: PerformanceResourceTiming): void {
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
  private getResourceType(url: string): string {
    if (url.match(/\.(js|jsx|ts|tsx)$/)) return 'script';
    if (url.match(/\.(css|scss|sass)$/)) return 'stylesheet';
    if (url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Performance decorator for functions
 */
export function measurePerformance<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    performanceMonitor.startTiming(name);
    
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.endTiming(name);
        }) as ReturnType<T>;
      }
      
      performanceMonitor.endTiming(name);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(name);
      throw error;
    }
  }) as T;
}

/**
 * Performance decorator for async functions
 */
export function measureAsyncPerformance<T extends (...args: unknown[]) => Promise<unknown>>(
  name: string,
  fn: T
): T {
  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    performanceMonitor.startTiming(name);
    
    try {
      const result = await fn(...args);
      performanceMonitor.endTiming(name);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(name);
      throw error;
    }
  }) as T;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
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
export function batchCalls<T extends (...args: unknown[]) => unknown>(
  fn: T,
  batchSize: number = 10,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let batch: Parameters<T>[] = [];
  let timeoutId: NodeJS.Timeout;

  const processBatch = () => {
    if (batch.length > 0) {
      const currentBatch = [...batch];
      batch = [];
      currentBatch.forEach(args => fn(...args));
    }
  };

  return (...args: Parameters<T>) => {
    batch.push(args);
    
    if (batch.length >= batchSize) {
      clearTimeout(timeoutId);
      processBatch();
    } else {
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
  getUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (!memory) {
        return null;
      }
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
  monitor(): void {
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
  private frames: number[] = [];
  // private lastTime = 0; // Removed unused variable
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    // this.lastTime = performance.now(); // Removed unused assignment
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
  }

  getFPS(): number {
    if (this.frames.length < 2) return 0;
    
    const now = performance.now();
    const validFrames = this.frames.filter(time => now - time < 1000);
    return validFrames.length;
  }

  private tick(): void {
    if (!this.isRunning) return;
    
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
  time: <T>(name: string, fn: () => T): T => {
    performanceMonitor.startTiming(name);
    try {
      const result = fn();
      performanceMonitor.endTiming(name);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(name);
      throw error;
    }
  },

  /**
   * Measure async function execution time
   */
  timeAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    performanceMonitor.startTiming(name);
    try {
      const result = await fn();
      performanceMonitor.endTiming(name);
      return result;
    } catch (error) {
      performanceMonitor.endTiming(name);
      throw error;
    }
  },

  /**
   * Record a custom metric
   */
  record: (name: string, value: number, unit: string = 'ms', metadata?: Record<string, unknown>) => {
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
