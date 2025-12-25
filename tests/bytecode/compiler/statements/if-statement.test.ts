import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  findByOp,
  expectNoDiagnostics,
  resetLabelCounter,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('IfStatement compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
  })

  describe('basic if (no else)', () => {
    it('compiles simple if statement', () => {
      const lines = getInstructions('if (x > 5) { y; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('LOAD_VAR')
      expect(ops).toContain('GT')
      expect(ops).toContain('JUMP_IF_FALSE')
      expect(ops).toContain('LABEL')
    })

    it('has correct instruction sequence', () => {
      const lines = getInstructions('if (x) { y; }')
      expectOps(lines, [
        'LOAD_VAR', // x
        'JUMP_IF_FALSE', // skip if false
        'LOAD_VAR', // y
        'POP', // expression statement
        'LABEL', // end
      ])
    })

    it('compiles the condition expression', () => {
      const lines = getInstructions('if (a > b) { c; }')
      const loadVars = findByOp(lines, 'LOAD_VAR')
      expect(loadVars.length).toBe(3) // a, b, c
      expect(loadVars[0].args[0]).toBe('a')
      expect(loadVars[1].args[0]).toBe('b')
    })

    it('has one label for if-only', () => {
      const lines = getInstructions('if (x) { y; }')
      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(1) // end label only
    })

    it('handles single-statement body (no braces)', () => {
      const lines = getInstructions('if (x) y;')
      expectOps(lines, [
        'LOAD_VAR', // x
        'JUMP_IF_FALSE',
        'LOAD_VAR', // y
        'POP',
        'LABEL',
      ])
    })
  })

  describe('if-else', () => {
    it('compiles if-else statement', () => {
      const lines = getInstructions('if (x) { a; } else { b; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('JUMP_IF_FALSE')
      expect(ops).toContain('JUMP')
      expect(ops.filter((op) => op === 'LABEL').length).toBe(2)
    })

    it('has correct instruction sequence for if-else', () => {
      const lines = getInstructions('if (x) { a; } else { b; }')
      expectOps(lines, [
        'LOAD_VAR', // x
        'JUMP_IF_FALSE', // to else
        'LOAD_VAR', // a
        'POP',
        'JUMP', // skip else
        'LABEL', // else
        'LOAD_VAR', // b
        'POP',
        'LABEL', // end
      ])
    })

    it('has two labels for if-else', () => {
      const lines = getInstructions('if (x) { a; } else { b; }')
      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(2) // else label and end label
    })
  })

  describe('else-if chains', () => {
    it('compiles if-else-if-else chain', () => {
      const lines = getInstructions('if (x === 1) { a; } else if (x === 2) { b; } else { c; }')

      // Should have multiple condition checks
      const eqOps = findByOp(lines, 'EQ')
      expect(eqOps.length).toBe(2)

      // Should have multiple labels
      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(4) // else1, if2-end, else2, final-end
    })
  })

  describe('nested if statements', () => {
    it('compiles nested if inside if', () => {
      const lines = getInstructions('if (x) { if (y) { z; } }')

      const jumpsIfFalse = findByOp(lines, 'JUMP_IF_FALSE')
      expect(jumpsIfFalse.length).toBe(2) // outer and inner if

      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(2) // outer and inner end labels
    })
  })

  describe('English narrations', () => {
    it('uses correct JUMP_IF_FALSE narration', () => {
      const lines = getInstructions('if (x) { y; }')
      const jumpIfFalse = findByOp(lines, 'JUMP_IF_FALSE')[0]
      expect(jumpIfFalse.english).toBe(expectedNarrations.JUMP_IF_FALSE('if_end_0'))
    })

    it('uses correct JUMP narration for else skip', () => {
      const lines = getInstructions('if (x) { a; } else { b; }')
      const jumps = findByOp(lines, 'JUMP')
      expect(jumps[0].english).toBe(expectedNarrations.JUMP('if_end_1'))
    })

    it('uses correct LABEL narration', () => {
      const lines = getInstructions('if (x) { y; }')
      const label = findByOp(lines, 'LABEL')[0]
      expect(label.english).toBe(expectedNarrations.LABEL('if_end_0'))
    })
  })

  describe('label generation', () => {
    it('generates unique labels for each if statement', () => {
      const lines = getInstructions('if (a) { x; } if (b) { y; }')
      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(2)
      expect(labels[0].args[0]).toBe('if_end_0')
      expect(labels[1].args[0]).toBe('if_end_1')
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid if statement', () => {
      const result = compileSource('if (true) { x; }')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for valid if-else statement', () => {
      const result = compileSource('if (x > 0) { a; } else { b; }')
      expectNoDiagnostics(result)
    })
  })
})
