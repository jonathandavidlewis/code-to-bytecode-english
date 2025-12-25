import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  expectNoDiagnostics,
  findByOp,
  expectedNarrations,
  resetLabelCounter,
} from '../../helpers/test-utils'

describe('WhileStatement compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
  })

  describe('basic while loop', () => {
    it('compiles simple while loop with correct structure', () => {
      const lines = getInstructions('while (x < 5) { x++; }')
      const ops = lines.map((l) => l.op)

      // Should have: LABEL, condition, JUMP_IF_FALSE, body, JUMP, LABEL
      expect(ops).toContain('LABEL')
      expect(ops).toContain('JUMP_IF_FALSE')
      expect(ops).toContain('JUMP')
    })

    it('has correct instruction sequence', () => {
      const lines = getInstructions('while (x < 5) { x++; }')

      // Find key instructions
      const labels = findByOp(lines, 'LABEL')
      const jumps = findByOp(lines, 'JUMP')
      const jumpIfFalse = findByOp(lines, 'JUMP_IF_FALSE')

      // Should have 2 labels (start and end)
      expect(labels.length).toBe(2)
      // Should have 1 unconditional jump (back to start)
      expect(jumps.length).toBe(1)
      // Should have 1 conditional jump (to end)
      expect(jumpIfFalse.length).toBe(1)
    })

    it('compiles the condition expression', () => {
      const lines = getInstructions('while (x < 5) { y; }')
      const ops = lines.map((l) => l.op)

      // Condition should load x, push 5, compare
      expect(ops).toContain('LOAD_VAR')
      expect(ops).toContain('PUSH_CONST')
      expect(ops).toContain('LT')
    })

    it('compiles the loop body', () => {
      const lines = getInstructions('while (true) { x++; }')
      const ops = lines.map((l) => l.op)

      // Body should have increment
      expect(ops).toContain('INCREMENT')
    })
  })

  describe('while loop with complex condition', () => {
    it('compiles while loop with binary expression condition', () => {
      const lines = getInstructions('while (a + b < 10) { a++; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('ADD')
      expect(ops).toContain('LT')
    })

    it('compiles while loop with variable condition', () => {
      const lines = getInstructions('while (running) { x++; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('LOAD_VAR')
    })
  })

  describe('while loop with multiple body statements', () => {
    it('compiles all statements in body', () => {
      const lines = getInstructions('while (x < 5) { x++; y++; }')
      const increments = findByOp(lines, 'INCREMENT')

      expect(increments.length).toBe(2)
    })
  })

  describe('while loop without braces', () => {
    it('compiles single statement body', () => {
      const lines = getInstructions('while (x < 5) x++;')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('INCREMENT')
      expect(ops).toContain('LABEL')
    })
  })

  describe('English narrations', () => {
    it('generates correct LABEL narration', () => {
      const lines = getInstructions('while (x) { y; }')
      const label = findByOp(lines, 'LABEL')[0]

      expect(label.english).toContain('Mark position')
      expect(label.english).toContain('as a jump target')
    })

    it('generates correct JUMP narration', () => {
      const lines = getInstructions('while (x) { y; }')
      const jump = findByOp(lines, 'JUMP')[0]

      expect(jump.english).toContain('Jump to position')
    })

    it('generates correct JUMP_IF_FALSE narration', () => {
      const lines = getInstructions('while (x) { y; }')
      const jumpIfFalse = findByOp(lines, 'JUMP_IF_FALSE')[0]

      expect(jumpIfFalse.english).toContain('if false, jump to')
    })
  })

  describe('label generation', () => {
    it('generates unique labels for each while loop', () => {
      const lines = getInstructions(`
        while (a) { a--; }
        while (b) { b--; }
      `)
      const labels = findByOp(lines, 'LABEL')

      // Should have 4 labels (2 per loop)
      expect(labels.length).toBe(4)

      // All label args should be unique
      const labelNames = labels.map((l) => l.args[0])
      expect(new Set(labelNames).size).toBe(4)
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid while loop', () => {
      const result = compileSource('while (x < 5) { x++; }')
      expectNoDiagnostics(result)
    })
  })
})
