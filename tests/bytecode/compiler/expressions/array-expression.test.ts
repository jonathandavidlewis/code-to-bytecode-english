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

describe('ArrayExpression compilation', () => {
  describe('empty array', () => {
    it('compiles empty array literal', () => {
      const lines = getInstructions('let x = [];')
      const createArray = findByOp(lines, 'CREATE_ARRAY')[0]

      expect(createArray).toBeDefined()
      expect(createArray.args[0]).toBe('0')
    })
  })

  describe('array with elements', () => {
    it('compiles array with numeric elements', () => {
      const lines = getInstructions('let x = [1, 2, 3];')
      const ops = lines.map((l) => l.op)

      // Should push each element then create array
      expect(ops.filter((op) => op === 'PUSH_CONST').length).toBe(3)
      expect(ops).toContain('CREATE_ARRAY')
    })

    it('pushes elements in order', () => {
      const lines = getInstructions('[1, 2, 3];')
      const pushConsts = findByOp(lines, 'PUSH_CONST')

      expect(pushConsts[0].args[0]).toBe('1')
      expect(pushConsts[1].args[0]).toBe('2')
      expect(pushConsts[2].args[0]).toBe('3')
    })

    it('creates array with correct element count', () => {
      const lines = getInstructions('[1, 2, 3];')
      const createArray = findByOp(lines, 'CREATE_ARRAY')[0]

      expect(createArray.args[0]).toBe('3')
    })

    it('compiles array with string elements', () => {
      const lines = getInstructions('let x = ["a", "b"];')
      const pushConsts = findByOp(lines, 'PUSH_CONST')

      expect(pushConsts.length).toBe(2)
      expect(pushConsts[0].args[0]).toBe('"a"')
      expect(pushConsts[1].args[0]).toBe('"b"')
    })

    it('compiles array with mixed types', () => {
      const lines = getInstructions('[1, "hello", true, null];')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('PUSH_CONST')
      expect(ops).toContain('PUSH_NULL')
      expect(ops).toContain('CREATE_ARRAY')
    })

    it('compiles array with variable references', () => {
      const lines = getInstructions('[x, y, z];')
      const loadVars = findByOp(lines, 'LOAD_VAR')

      expect(loadVars.length).toBe(3)
      expect(loadVars[0].args[0]).toBe('x')
      expect(loadVars[1].args[0]).toBe('y')
      expect(loadVars[2].args[0]).toBe('z')
    })

    it('compiles array with expression elements', () => {
      const lines = getInstructions('[1 + 2, 3 * 4];')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('ADD')
      expect(ops).toContain('MUL')
      expect(ops).toContain('CREATE_ARRAY')
    })
  })

  describe('nested arrays', () => {
    it('compiles nested array literals', () => {
      const lines = getInstructions('[[1, 2], [3, 4]];')
      const createArrays = findByOp(lines, 'CREATE_ARRAY')

      // Should have 3 CREATE_ARRAY: 2 inner + 1 outer
      expect(createArrays.length).toBe(3)
    })
  })

  describe('sparse arrays', () => {
    it('compiles sparse array with undefined for holes', () => {
      const lines = getInstructions('[1, , 3];')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('PUSH_UNDEFINED')
      expect(findByOp(lines, 'CREATE_ARRAY')[0].args[0]).toBe('3')
    })
  })

  describe('array in for-in loop', () => {
    it('compiles array as for-in target', () => {
      const lines = getInstructions('for (let i in [1, 2, 3]) { i; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('CREATE_ARRAY')
      expect(ops).toContain('GET_KEYS')
    })
  })

  describe('English narrations', () => {
    it('generates correct CREATE_ARRAY narration for empty array', () => {
      const lines = getInstructions('[];')
      const createArray = findByOp(lines, 'CREATE_ARRAY')[0]

      expect(createArray.english).toBe(expectedNarrations.CREATE_ARRAY('0'))
    })

    it('generates correct CREATE_ARRAY narration for non-empty array', () => {
      const lines = getInstructions('[1, 2, 3];')
      const createArray = findByOp(lines, 'CREATE_ARRAY')[0]

      expect(createArray.english).toBe(expectedNarrations.CREATE_ARRAY('3'))
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for simple array', () => {
      const result = compileSource('[1, 2, 3];')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for array with expressions', () => {
      const result = compileSource('[1 + 2, x, "hello"];')
      expectNoDiagnostics(result)
    })

    it('produces diagnostic for spread elements', () => {
      const result = compileSource('[...arr];')
      expectDiagnostic(result.diagnostics, 'Spread elements in arrays not supported')
    })
  })
})
