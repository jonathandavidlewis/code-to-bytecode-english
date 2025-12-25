import { describe, it, expect } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  expectNoDiagnostics,
  expectDiagnostic,
  findByOp,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('UpdateExpression compilation', () => {
  describe('post-increment (i++)', () => {
    it('compiles i++ correctly', () => {
      const lines = getInstructions('x++;')
      expectOps(lines, ['LOAD_VAR', 'INCREMENT', 'POP'])
    })

    it('loads value before incrementing', () => {
      const lines = getInstructions('x++;')
      const ops = lines.map((l) => l.op)

      // LOAD_VAR should come before INCREMENT
      const loadIndex = ops.indexOf('LOAD_VAR')
      const incIndex = ops.indexOf('INCREMENT')
      expect(loadIndex).toBeLessThan(incIndex)
    })

    it('increments the correct variable', () => {
      const lines = getInstructions('myVar++;')
      const increment = findByOp(lines, 'INCREMENT')[0]
      const loadVar = findByOp(lines, 'LOAD_VAR')[0]

      expect(increment.args[0]).toBe('myVar')
      expect(loadVar.args[0]).toBe('myVar')
    })
  })

  describe('pre-increment (++i)', () => {
    it('compiles ++i correctly', () => {
      const lines = getInstructions('++x;')
      expectOps(lines, ['INCREMENT', 'LOAD_VAR', 'POP'])
    })

    it('increments before loading value', () => {
      const lines = getInstructions('++x;')
      const ops = lines.map((l) => l.op)

      // INCREMENT should come before LOAD_VAR
      const incIndex = ops.indexOf('INCREMENT')
      const loadIndex = ops.indexOf('LOAD_VAR')
      expect(incIndex).toBeLessThan(loadIndex)
    })
  })

  describe('post-decrement (i--)', () => {
    it('compiles i-- correctly', () => {
      const lines = getInstructions('x--;')
      expectOps(lines, ['LOAD_VAR', 'DECREMENT', 'POP'])
    })

    it('loads value before decrementing', () => {
      const lines = getInstructions('x--;')
      const ops = lines.map((l) => l.op)

      const loadIndex = ops.indexOf('LOAD_VAR')
      const decIndex = ops.indexOf('DECREMENT')
      expect(loadIndex).toBeLessThan(decIndex)
    })

    it('decrements the correct variable', () => {
      const lines = getInstructions('counter--;')
      const decrement = findByOp(lines, 'DECREMENT')[0]

      expect(decrement.args[0]).toBe('counter')
    })
  })

  describe('pre-decrement (--i)', () => {
    it('compiles --i correctly', () => {
      const lines = getInstructions('--x;')
      expectOps(lines, ['DECREMENT', 'LOAD_VAR', 'POP'])
    })

    it('decrements before loading value', () => {
      const lines = getInstructions('--x;')
      const ops = lines.map((l) => l.op)

      const decIndex = ops.indexOf('DECREMENT')
      const loadIndex = ops.indexOf('LOAD_VAR')
      expect(decIndex).toBeLessThan(loadIndex)
    })
  })

  describe('in variable initialization', () => {
    it('compiles x++ in variable assignment', () => {
      const lines = getInstructions('let y = x++;')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('DECLARE_VAR')
      expect(ops).toContain('LOAD_VAR')
      expect(ops).toContain('INCREMENT')
      expect(ops).toContain('STORE_VAR')
    })
  })

  describe('English narrations', () => {
    it('generates correct INCREMENT narration', () => {
      const lines = getInstructions('x++;')
      const increment = findByOp(lines, 'INCREMENT')[0]

      expect(increment.english).toBe(expectedNarrations.INCREMENT('x'))
    })

    it('generates correct DECREMENT narration', () => {
      const lines = getInstructions('x--;')
      const decrement = findByOp(lines, 'DECREMENT')[0]

      expect(decrement.english).toBe(expectedNarrations.DECREMENT('x'))
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid post-increment', () => {
      const result = compileSource('x++;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for valid pre-increment', () => {
      const result = compileSource('++x;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for valid post-decrement', () => {
      const result = compileSource('x--;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for valid pre-decrement', () => {
      const result = compileSource('--x;')
      expectNoDiagnostics(result)
    })

    it('produces diagnostic for complex update expression', () => {
      const result = compileSource('obj.prop++;')
      expectDiagnostic(result.diagnostics, 'Complex update expressions not supported')
    })
  })
})
