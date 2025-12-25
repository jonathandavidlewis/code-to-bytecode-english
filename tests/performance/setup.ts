/**
 * Performance test setup
 */

// Performance tracking utility
export function createPerformanceTracker() {
  const measurements = new Map<string, number[]>()

  return {
    start(label: string) {
      if (!measurements.has(label)) {
        measurements.set(label, [])
      }
      return performance.now()
    },

    end(label: string, startTime: number) {
      const duration = performance.now() - startTime
      measurements.get(label)?.push(duration)
      return duration
    },

    getStats(label: string) {
      const times = measurements.get(label) || []
      if (times.length === 0) return null

      const sorted = [...times].sort((a, b) => a - b)
      return {
        count: times.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median: sorted[Math.floor(sorted.length / 2)],
        mean: times.reduce((a, b) => a + b) / times.length,
        p95: sorted[Math.floor(sorted.length * 0.95)],
      }
    },

    reset() {
      measurements.clear()
    },
  }
}

// Export a singleton tracker for convenience
export const perfTracker = createPerformanceTracker()
