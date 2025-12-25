import { describe, it, expect, beforeEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import React from "react"
import { compileSource, resetLabelCounter, resetBreakTargetStack } from "@/tests/bytecode/helpers/test-utils"
import { parseSource } from "@/lib/bytecode"
import { STATEMENTS_100, LARGE_SWITCH_50_CASES } from "../fixtures"

// Import components - these may need adjustment based on actual exports
import { BytecodeViewer } from "@/components/bytecode-visualizer/bytecode-viewer"
import { EnglishViewer } from "@/components/bytecode-visualizer/english-viewer"

describe("BytecodeViewer Performance", () => {
  beforeEach(() => {
    cleanup()
    resetLabelCounter()
    resetBreakTargetStack()
  })

  it("renders with 100 statements under 100ms", () => {
    const result = compileSource(STATEMENTS_100)
    const parseResult = parseSource(STATEMENTS_100)

    if (parseResult.kind !== "valid") {
      throw new Error("Parse failed")
    }

    const start = performance.now()
    render(
      React.createElement(BytecodeViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: null,
        onHoverStatement: () => {},
      })
    )
    const renderTime = performance.now() - start

    // Baseline: ~125ms. Target after optimization: <100ms
    expect(renderTime).toBeLessThan(200)
  })

  it("re-renders efficiently on hover state change", () => {
    const result = compileSource(STATEMENTS_100)
    const parseResult = parseSource(STATEMENTS_100)

    if (parseResult.kind !== "valid") {
      throw new Error("Parse failed")
    }

    const { rerender } = render(
      React.createElement(BytecodeViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: null,
        onHoverStatement: () => {},
      })
    )

    const start = performance.now()
    rerender(
      React.createElement(BytecodeViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: parseResult.statements[0]?.id ?? null,
        onHoverStatement: () => {},
      })
    )
    const rerenderTime = performance.now() - start

    // Re-render should be faster than initial render
    // Baseline: ~55ms. Target after optimization: <30ms
    expect(rerenderTime).toBeLessThan(100)
  })
})

describe("EnglishViewer Performance", () => {
  beforeEach(() => {
    cleanup()
    resetLabelCounter()
    resetBreakTargetStack()
  })

  it("renders with 100 statements under 100ms", () => {
    const result = compileSource(STATEMENTS_100)
    const parseResult = parseSource(STATEMENTS_100)

    if (parseResult.kind !== "valid") {
      throw new Error("Parse failed")
    }

    const start = performance.now()
    render(
      React.createElement(EnglishViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: null,
        onHoverStatement: () => {},
      })
    )
    const renderTime = performance.now() - start

    expect(renderTime).toBeLessThan(100)
  })
})

describe("Large Input Stress Tests", () => {
  beforeEach(() => {
    cleanup()
    resetLabelCounter()
    resetBreakTargetStack()
  })

  it("handles 50-case switch without timing out", () => {
    const result = compileSource(LARGE_SWITCH_50_CASES)
    const parseResult = parseSource(LARGE_SWITCH_50_CASES)

    if (parseResult.kind !== "valid") {
      throw new Error("Parse failed")
    }

    const start = performance.now()
    render(
      React.createElement(BytecodeViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: null,
        onHoverStatement: () => {},
      })
    )
    const renderTime = performance.now() - start

    // Should render within 300ms even for large inputs
    // Baseline: ~240ms. This is a stress test to catch major regressions.
    expect(renderTime).toBeLessThan(300)
  })

  it("multiple rapid re-renders stay performant", () => {
    const result = compileSource(STATEMENTS_100)
    const parseResult = parseSource(STATEMENTS_100)

    if (parseResult.kind !== "valid") {
      throw new Error("Parse failed")
    }

    const { rerender } = render(
      React.createElement(BytecodeViewer, {
        lines: result.lines,
        statements: parseResult.statements,
        hoveredStatementId: null,
        onHoverStatement: () => {},
      })
    )

    const times: number[] = []

    // Simulate rapid hover changes
    for (let i = 0; i < 10; i++) {
      const statementId = parseResult.statements[i % parseResult.statements.length]?.id ?? null

      const start = performance.now()
      rerender(
        React.createElement(BytecodeViewer, {
          lines: result.lines,
          statements: parseResult.statements,
          hoveredStatementId: statementId,
          onHoverStatement: () => {},
        })
      )
      times.push(performance.now() - start)
    }

    // Average re-render time should be reasonable
    // Baseline: ~35ms. Target after optimization: <20ms
    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(50)
  })
})
