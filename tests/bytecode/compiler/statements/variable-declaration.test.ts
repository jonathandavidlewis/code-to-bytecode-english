import { describe, it, expect } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  expectInstruction,
  expectInstructionSequence,
  expectNoDiagnostics,
  expectDiagnostic,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('VariableDeclaration compilation', () => {
  describe('let declarations', () => {
    it('compiles uninitialized variable', () => {
      const lines = getInstructions('let x;')
      expectOps(lines, ['DECLARE_VAR'])
      expectInstruction(lines[0], { op: 'DECLARE_VAR', args: ['x'] })
    })

    it('compiles variable with numeric initializer', () => {
      const lines = getInstructions('let x = 42;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['x'] },
        { op: 'PUSH_CONST', args: ['42'] },
        { op: 'STORE_VAR', args: ['x'] },
      ])
    })

    it('compiles variable with string initializer', () => {
      const lines = getInstructions('let name = "hello";')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['name'] },
        { op: 'PUSH_CONST', args: ['"hello"'] },
        { op: 'STORE_VAR', args: ['name'] },
      ])
    })

    it('compiles variable with boolean initializer', () => {
      const lines = getInstructions('let flag = true;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['flag'] },
        { op: 'PUSH_CONST', args: ['true'] },
        { op: 'STORE_VAR', args: ['flag'] },
      ])
    })

    it('compiles variable with null initializer', () => {
      const lines = getInstructions('let x = null;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['x'] },
        { op: 'PUSH_NULL' },
        { op: 'STORE_VAR', args: ['x'] },
      ])
    })

    it('compiles variable with expression initializer', () => {
      const lines = getInstructions('let sum = 1 + 2;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['sum'] },
        { op: 'PUSH_CONST', args: ['1'] },
        { op: 'PUSH_CONST', args: ['2'] },
        { op: 'ADD' },
        { op: 'STORE_VAR', args: ['sum'] },
      ])
    })

    it('compiles variable with variable reference initializer', () => {
      const lines = getInstructions('let y = x;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['y'] },
        { op: 'LOAD_VAR', args: ['x'] },
        { op: 'STORE_VAR', args: ['y'] },
      ])
    })
  })

  describe('const declarations', () => {
    it('compiles const declaration same as let', () => {
      const lines = getInstructions('const PI = 3.14;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['PI'] },
        { op: 'PUSH_CONST', args: ['3.14'] },
        { op: 'STORE_VAR', args: ['PI'] },
      ])
    })

    it('compiles const with string value', () => {
      const lines = getInstructions('const NAME = "test";')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['NAME'] },
        { op: 'PUSH_CONST', args: ['"test"'] },
        { op: 'STORE_VAR', args: ['NAME'] },
      ])
    })
  })

  describe('var declarations', () => {
    it('compiles var declaration same as let', () => {
      const lines = getInstructions('var x = 10;')
      expectInstructionSequence(lines, [
        { op: 'DECLARE_VAR', args: ['x'] },
        { op: 'PUSH_CONST', args: ['10'] },
        { op: 'STORE_VAR', args: ['x'] },
      ])
    })
  })

  describe('multiple declarators', () => {
    it('compiles multiple uninitialized variables', () => {
      const lines = getInstructions('let a, b, c;')
      expectOps(lines, ['DECLARE_VAR', 'DECLARE_VAR', 'DECLARE_VAR'])
    })

    it('compiles multiple initialized variables', () => {
      const lines = getInstructions('let a = 1, b = 2;')
      expectOps(lines, [
        'DECLARE_VAR',
        'PUSH_CONST',
        'STORE_VAR',
        'DECLARE_VAR',
        'PUSH_CONST',
        'STORE_VAR',
      ])
    })

    it('compiles mixed initialized and uninitialized', () => {
      const lines = getInstructions('let a = 1, b;')
      expectOps(lines, ['DECLARE_VAR', 'PUSH_CONST', 'STORE_VAR', 'DECLARE_VAR'])
    })
  })

  describe('English narrations', () => {
    it('generates correct DECLARE_VAR narration', () => {
      const lines = getInstructions('let x = 1;')
      expect(lines[0].english).toBe(expectedNarrations.DECLARE_VAR('x'))
    })

    it('generates correct STORE_VAR narration', () => {
      const lines = getInstructions('let x = 1;')
      expect(lines[2].english).toBe(expectedNarrations.STORE_VAR('x'))
    })

    it('generates correct PUSH_CONST narration', () => {
      const lines = getInstructions('let x = 42;')
      expect(lines[1].english).toBe(expectedNarrations.PUSH_CONST('42'))
    })
  })

  describe('unsupported patterns', () => {
    it('generates diagnostic for destructuring', () => {
      const result = compileSource('let { a, b } = obj;')
      expectDiagnostic(result.diagnostics, 'Destructuring')
    })

    it('generates diagnostic for array destructuring', () => {
      const result = compileSource('let [a, b] = arr;')
      expectDiagnostic(result.diagnostics, 'Destructuring')
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for simple declarations', () => {
      const result = compileSource('let x = 42;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for multiple declarators', () => {
      const result = compileSource('let a = 1, b = 2, c = 3;')
      expectNoDiagnostics(result)
    })
  })
})
