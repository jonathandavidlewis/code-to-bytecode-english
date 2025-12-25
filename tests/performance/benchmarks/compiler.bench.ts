import { bench, describe, beforeEach } from "vitest"
import { compileSource, resetLabelCounter, resetBreakTargetStack } from "@/tests/bytecode/helpers/test-utils"
import {
  LARGE_SWITCH_50_CASES,
  STATEMENTS_100,
  NESTED_LOOPS_5_DEEP,
  PROBLEMATIC_SWITCH_INPUT,
  generateSwitchStatement,
  generateStatements,
} from "../fixtures"

describe("Parser Performance", () => {
  beforeEach(() => {
    resetLabelCounter()
    resetBreakTargetStack()
  })

  bench("parse simple statement", () => {
    compileSource("const x = 1;")
  })

  bench("parse 10 statements", () => {
    compileSource(generateStatements(10))
  })

  bench("parse 50 statements", () => {
    compileSource(generateStatements(50))
  })

  bench("parse 100 statements", () => {
    compileSource(STATEMENTS_100)
  })
})

describe("Compiler Performance", () => {
  beforeEach(() => {
    resetLabelCounter()
    resetBreakTargetStack()
  })

  bench("compile simple assignment", () => {
    compileSource("const x = 1 + 2 * 3;")
  })

  bench("compile 10-case switch", () => {
    compileSource(generateSwitchStatement(10))
  })

  bench("compile 50-case switch", () => {
    compileSource(LARGE_SWITCH_50_CASES)
  })

  bench("compile 100 statements", () => {
    compileSource(STATEMENTS_100)
  })

  bench("compile nested loops (5 deep)", () => {
    compileSource(NESTED_LOOPS_5_DEEP)
  })

  bench("compile problematic switch input", () => {
    compileSource(PROBLEMATIC_SWITCH_INPUT)
  })
})

describe("Instruction Scaling", () => {
  beforeEach(() => {
    resetLabelCounter()
    resetBreakTargetStack()
  })

  // Test that instruction count scales linearly
  bench("switch 10 cases", () => {
    compileSource(generateSwitchStatement(10))
  })

  bench("switch 25 cases", () => {
    compileSource(generateSwitchStatement(25))
  })

  bench("switch 50 cases", () => {
    compileSource(generateSwitchStatement(50))
  })

  bench("switch 75 cases", () => {
    compileSource(generateSwitchStatement(75))
  })
})
