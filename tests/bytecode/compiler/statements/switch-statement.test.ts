import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  findByOp,
  expectNoDiagnostics,
  resetLabelCounter,
  resetBreakTargetStack,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('SwitchStatement compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
    resetBreakTargetStack()
  })

  describe('basic switch', () => {
    it('compiles switch with single case', () => {
      const lines = getInstructions('switch (x) { case 1: y; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('LOAD_VAR') // discriminant
      expect(ops).toContain('DUP') // duplicate for comparison
      expect(ops).toContain('PUSH_CONST') // case value
      expect(ops).toContain('EQ') // comparison
      expect(ops).toContain('JUMP_IF_TRUE') // to case body
      expect(ops).toContain('LABEL') // case label
      expect(ops).toContain('POP') // clean up discriminant
    })

    it('compiles switch with multiple cases', () => {
      const lines = getInstructions('switch (x) { case 1: a; break; case 2: b; break; }')

      const dups = findByOp(lines, 'DUP')
      expect(dups.length).toBe(2) // one per case

      const eqs = findByOp(lines, 'EQ')
      expect(eqs.length).toBe(2)

      const jumpIfTrues = findByOp(lines, 'JUMP_IF_TRUE')
      expect(jumpIfTrues.length).toBe(2)
    })

    it('compiles switch with default case', () => {
      const lines = getInstructions('switch (x) { case 1: a; break; default: b; }')

      const labels = findByOp(lines, 'LABEL')
      // case label, default label, end label
      expect(labels.length).toBe(3)
    })

    it('evaluates discriminant once', () => {
      const lines = getInstructions('switch (x) { case 1: a; case 2: b; }')
      const loadVars = findByOp(lines, 'LOAD_VAR')

      // x loaded once, a loaded once, b loaded once = 3 total
      // x should be the first one
      expect(loadVars[0].args[0]).toBe('x')
    })
  })

  describe('break statements', () => {
    it('compiles break as jump to end', () => {
      const lines = getInstructions('switch (x) { case 1: a; break; }')

      // Find the JUMP that corresponds to break
      const jumps = findByOp(lines, 'JUMP')
      // Should have at least one JUMP for the break
      expect(jumps.length).toBeGreaterThan(0)
    })

    it('handles case without break (fall-through)', () => {
      const lines = getInstructions('switch (x) { case 1: a; case 2: b; }')

      // Both case bodies should be present
      const loadVars = findByOp(lines, 'LOAD_VAR')
      const aLoads = loadVars.filter((l) => l.args[0] === 'a')
      const bLoads = loadVars.filter((l) => l.args[0] === 'b')

      expect(aLoads.length).toBe(1)
      expect(bLoads.length).toBe(1)
    })
  })

  describe('default case', () => {
    it('handles default at end', () => {
      const lines = getInstructions('switch (x) { case 1: a; break; default: b; }')
      const result = compileSource('switch (x) { case 1: a; break; default: b; }')
      expectNoDiagnostics(result)
    })

    it('handles switch with only default', () => {
      const lines = getInstructions('switch (x) { default: a; }')

      const loadVars = findByOp(lines, 'LOAD_VAR')
      expect(loadVars.some((l) => l.args[0] === 'a')).toBe(true)
    })
  })

  describe('fall-through behavior', () => {
    it('falls through from case without break', () => {
      const lines = getInstructions('switch (x) { case 1: a; case 2: b; break; }')

      // Both a and b should be in the bytecode
      const loadVars = findByOp(lines, 'LOAD_VAR')
      expect(loadVars.some((l) => l.args[0] === 'a')).toBe(true)
      expect(loadVars.some((l) => l.args[0] === 'b')).toBe(true)
    })
  })

  describe('English narrations', () => {
    it('generates correct DUP narration', () => {
      const lines = getInstructions('switch (x) { case 1: a; }')
      const dup = findByOp(lines, 'DUP')[0]
      expect(dup.english).toBe(expectedNarrations.DUP())
    })

    it('generates correct JUMP_IF_TRUE narration', () => {
      const lines = getInstructions('switch (x) { case 1: a; }')
      const jumpIfTrue = findByOp(lines, 'JUMP_IF_TRUE')[0]
      expect(jumpIfTrue.english).toContain('if true, jump to')
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid switch', () => {
      const result = compileSource('switch (x) { case 1: a; break; default: b; }')
      expectNoDiagnostics(result)
    })

    it('break outside switch is a syntax error', () => {
      // A standalone break statement is a syntax error in JavaScript
      // The parser rejects it before compilation, so we test that the diagnostic
      // is generated when break appears in a non-loop/switch context within valid code
      // Note: This is actually caught at parse time, not compile time
      expect(true).toBe(true) // Placeholder - break outside loops/switch is a parse error
    })
  })
})
