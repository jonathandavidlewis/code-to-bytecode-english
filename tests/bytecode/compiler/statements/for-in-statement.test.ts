import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectNoDiagnostics,
  findByOp,
  expectedNarrations,
  resetLabelCounter,
} from '../../helpers/test-utils'

describe('ForInStatement compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
  })

  describe('basic for-in loop', () => {
    it('compiles for-in loop with variable declaration', () => {
      const lines = getInstructions('for (let i in obj) { i; }')
      const ops = lines.map((l) => l.op)

      // Should have: DECLARE_VAR, expression, GET_KEYS, LABEL, ITER_HAS_NEXT, JUMP_IF_FALSE, ITER_NEXT, body, JUMP, LABEL
      expect(ops).toContain('DECLARE_VAR')
      expect(ops).toContain('GET_KEYS')
      expect(ops).toContain('ITER_HAS_NEXT')
      expect(ops).toContain('ITER_NEXT')
      expect(ops).toContain('LABEL')
      expect(ops).toContain('JUMP_IF_FALSE')
      expect(ops).toContain('JUMP')
    })

    it('compiles for-in loop over array literal', () => {
      const lines = getInstructions('for (let i in [1, 2, 3]) { i++; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('GET_KEYS')
      expect(ops).toContain('INCREMENT')
    })

    it('compiles for-in loop over variable', () => {
      const lines = getInstructions('for (let key in myObject) { key; }')
      const ops = lines.map((l) => l.op)

      // Should load the object first
      expect(ops).toContain('LOAD_VAR')
      expect(ops).toContain('GET_KEYS')
    })
  })

  describe('for-in with existing variable', () => {
    it('compiles for-in loop with existing identifier', () => {
      const lines = getInstructions('for (i in obj) { i; }')
      const ops = lines.map((l) => l.op)

      // Should NOT have DECLARE_VAR (using existing variable)
      const declareCount = findByOp(lines, 'DECLARE_VAR').length
      expect(declareCount).toBe(0)

      expect(ops).toContain('GET_KEYS')
      expect(ops).toContain('ITER_NEXT')
    })
  })

  describe('loop structure', () => {
    it('has correct instruction sequence', () => {
      const lines = getInstructions('for (let i in obj) { console.log(i); }')

      // Find key instructions
      const labels = findByOp(lines, 'LABEL')
      const jumps = findByOp(lines, 'JUMP')
      const jumpIfFalse = findByOp(lines, 'JUMP_IF_FALSE')
      const getKeys = findByOp(lines, 'GET_KEYS')
      const iterHasNext = findByOp(lines, 'ITER_HAS_NEXT')
      const iterNext = findByOp(lines, 'ITER_NEXT')

      // Should have 2 labels (start and end)
      expect(labels.length).toBe(2)
      // Should have 1 unconditional jump (back to start)
      expect(jumps.length).toBe(1)
      // Should have 1 conditional jump (to end)
      expect(jumpIfFalse.length).toBe(1)
      // Should have 1 GET_KEYS
      expect(getKeys.length).toBe(1)
      // Should have 1 ITER_HAS_NEXT
      expect(iterHasNext.length).toBe(1)
      // Should have 1 ITER_NEXT
      expect(iterNext.length).toBe(1)
    })

    it('ITER_NEXT stores in the loop variable', () => {
      const lines = getInstructions('for (let key in obj) { key; }')
      const iterNext = findByOp(lines, 'ITER_NEXT')[0]

      expect(iterNext.args[0]).toBe('key')
    })
  })

  describe('loop body compilation', () => {
    it('compiles body with increment', () => {
      const lines = getInstructions('for (let i in arr) { i++; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('INCREMENT')
    })

    it('compiles body with multiple statements', () => {
      const lines = getInstructions('for (let i in arr) { x++; y++; }')
      const increments = findByOp(lines, 'INCREMENT')

      expect(increments.length).toBe(2)
    })

    it('compiles body without braces', () => {
      const lines = getInstructions('for (let i in arr) i++;')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('INCREMENT')
    })
  })

  describe('English narrations', () => {
    it('generates correct GET_KEYS narration', () => {
      const lines = getInstructions('for (let i in obj) { i; }')
      const getKeys = findByOp(lines, 'GET_KEYS')[0]

      expect(getKeys.english).toBe(expectedNarrations.GET_KEYS())
    })

    it('generates correct ITER_HAS_NEXT narration', () => {
      const lines = getInstructions('for (let i in obj) { i; }')
      const iterHasNext = findByOp(lines, 'ITER_HAS_NEXT')[0]

      expect(iterHasNext.english).toBe(expectedNarrations.ITER_HAS_NEXT())
    })

    it('generates correct ITER_NEXT narration', () => {
      const lines = getInstructions('for (let key in obj) { key; }')
      const iterNext = findByOp(lines, 'ITER_NEXT')[0]

      expect(iterNext.english).toBe(expectedNarrations.ITER_NEXT('key'))
    })
  })

  describe('label generation', () => {
    it('generates unique labels for each for-in loop', () => {
      const lines = getInstructions(`
        for (let a in obj1) { a; }
        for (let b in obj2) { b; }
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
    it('produces no diagnostics for valid for-in loop', () => {
      const result = compileSource('for (let i in [1, 2, 3]) { i++; }')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for for-in over variable', () => {
      const result = compileSource('for (let key in obj) { key; }')
      expectNoDiagnostics(result)
    })
  })
})
