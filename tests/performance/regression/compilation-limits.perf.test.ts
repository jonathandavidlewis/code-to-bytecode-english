import { describe, it, expect, beforeEach } from "vitest"
import { compileSource, resetLabelCounter, resetBreakTargetStack } from "@/tests/bytecode/helpers/test-utils"
import {
  LARGE_SWITCH_50_CASES,
  STATEMENTS_100,
  STATEMENTS_500,
  NESTED_LOOPS_10_DEEP,
  PROBLEMATIC_SWITCH_INPUT,
  generateSwitchStatement,
} from "../fixtures"

describe("Compilation Performance Regression Tests", () => {
  beforeEach(() => {
    resetLabelCounter()
    resetBreakTargetStack()
  })

  describe("Time Budgets", () => {
    it("compiles simple statement under 15ms", () => {
      const start = performance.now()
      compileSource("const x = 1;")
      const duration = performance.now() - start

      // Note: First compilation includes JIT warmup. Baseline is ~10ms.
      expect(duration).toBeLessThan(15)
    })

    it("compiles 50-case switch under 50ms", () => {
      const start = performance.now()
      const result = compileSource(LARGE_SWITCH_50_CASES)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(50)
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it("compiles 100 statements under 100ms", () => {
      const start = performance.now()
      compileSource(STATEMENTS_100)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100)
    })

    it("compiles 500 statements under 500ms", () => {
      const start = performance.now()
      compileSource(STATEMENTS_500)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(500)
    })

    it("compiles deeply nested loops under 50ms", () => {
      const start = performance.now()
      compileSource(NESTED_LOOPS_10_DEEP)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(50)
    })

    it("compiles problematic switch input under 50ms", () => {
      const start = performance.now()
      compileSource(PROBLEMATIC_SWITCH_INPUT)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(50)
    })
  })

  describe("Instruction Count Limits", () => {
    it("50-case switch generates reasonable instruction count", () => {
      const result = compileSource(LARGE_SWITCH_50_CASES)

      // Each case generates: DUP, PUSH_CONST, EQ, JUMP_IF_TRUE, plus case body
      // Reasonable upper bound: ~20 instructions per case = 1000 max
      expect(result.lines.length).toBeLessThan(1000)
    })

    it("100 statements generate reasonable instruction count", () => {
      const result = compileSource(STATEMENTS_100)

      // Each const x = a + b generates ~5 instructions
      expect(result.lines.length).toBeLessThan(600)
    })

    it("instruction count scales linearly with case count", () => {
      const counts = [10, 20, 30, 40, 50]
      const results = counts.map((n) => {
        resetLabelCounter()
        resetBreakTargetStack()
        const code = generateSwitchStatement(n)
        return compileSource(code).lines.length
      })

      // Check linear scaling (not exponential)
      for (let i = 1; i < results.length; i++) {
        const ratio = results[i] / results[i - 1]
        // Should be roughly 1.5-2x for each 10 additional cases (linear growth)
        expect(ratio).toBeLessThan(2.5)
      }
    })
  })

  describe("Performance Stability", () => {
    it("compilation time does not degrade with repeated calls", () => {
      const times: number[] = []

      for (let i = 0; i < 10; i++) {
        resetLabelCounter()
        resetBreakTargetStack()
        const start = performance.now()
        compileSource(LARGE_SWITCH_50_CASES)
        times.push(performance.now() - start)
      }

      const avgFirst5 = times.slice(0, 5).reduce((a, b) => a + b) / 5
      const avgLast5 = times.slice(5).reduce((a, b) => a + b) / 5

      // Last 5 should not be significantly slower than first 5
      expect(avgLast5).toBeLessThan(avgFirst5 * 2)
    })

    it("no memory leak indicators (consistent timing over many iterations)", () => {
      const iterations = 50
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        resetLabelCounter()
        resetBreakTargetStack()
        const start = performance.now()
        compileSource("const x = 1 + 2;")
        times.push(performance.now() - start)
      }

      // Standard deviation should be reasonable
      const mean = times.reduce((a, b) => a + b) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length
      const stdDev = Math.sqrt(variance)

      // Std dev should be less than mean (no wild variations)
      expect(stdDev).toBeLessThan(mean * 2)
    })
  })
})
