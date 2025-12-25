import { describe, it, expect } from 'vitest'
import { getInstructions, expectInstruction, expectOps, expectedNarrations } from '../../helpers/test-utils'

describe('Literal expressions', () => {
  describe('NumericLiteral', () => {
    it('compiles integer', () => {
      const lines = getInstructions('42;')
      expectInstruction(lines[0], { op: 'PUSH_CONST', args: ['42'] })
    })

    it('compiles float', () => {
      const lines = getInstructions('3.14;')
      expectInstruction(lines[0], { op: 'PUSH_CONST', args: ['3.14'] })
    })

    it('compiles zero', () => {
      const lines = getInstructions('0;')
      expectInstruction(lines[0], { op: 'PUSH_CONST', args: ['0'] })
    })

    it('ends with POP for expression statement', () => {
      const lines = getInstructions('42;')
      expectOps(lines, ['PUSH_CONST', 'POP'])
    })

    it('generates correct English narration', () => {
      const lines = getInstructions('42;')
      expect(lines[0].english).toBe(expectedNarrations.PUSH_CONST('42'))
    })
  })

  describe('StringLiteral', () => {
    it('compiles simple string in variable', () => {
      const lines = getInstructions('let x = "hello";')
      // DECLARE_VAR, PUSH_CONST, STORE_VAR
      expectInstruction(lines[1], { op: 'PUSH_CONST', args: ['"hello"'] })
    })

    it('compiles empty string in variable', () => {
      const lines = getInstructions('let x = "";')
      expectInstruction(lines[1], { op: 'PUSH_CONST', args: ['""'] })
    })

    it('compiles string with spaces', () => {
      const lines = getInstructions('let x = "hello world";')
      expectInstruction(lines[1], { op: 'PUSH_CONST', args: ['"hello world"'] })
    })

    it('compiles single-quoted strings', () => {
      const lines = getInstructions("let x = 'hello';")
      expectInstruction(lines[1], { op: 'PUSH_CONST', args: ['"hello"'] })
    })

    it('generates correct English narration', () => {
      const lines = getInstructions('let x = "test";')
      expect(lines[1].english).toBe(expectedNarrations.PUSH_CONST('"test"'))
    })
  })

  describe('BooleanLiteral', () => {
    it('compiles true', () => {
      const lines = getInstructions('true;')
      expectInstruction(lines[0], { op: 'PUSH_CONST', args: ['true'] })
    })

    it('compiles false', () => {
      const lines = getInstructions('false;')
      expectInstruction(lines[0], { op: 'PUSH_CONST', args: ['false'] })
    })

    it('generates correct English narration for true', () => {
      const lines = getInstructions('true;')
      expect(lines[0].english).toBe(expectedNarrations.PUSH_CONST('true'))
    })

    it('generates correct English narration for false', () => {
      const lines = getInstructions('false;')
      expect(lines[0].english).toBe(expectedNarrations.PUSH_CONST('false'))
    })
  })

  describe('NullLiteral', () => {
    it('compiles null', () => {
      const lines = getInstructions('null;')
      expectInstruction(lines[0], { op: 'PUSH_NULL' })
    })

    it('generates correct English narration', () => {
      const lines = getInstructions('null;')
      expect(lines[0].english).toBe(expectedNarrations.PUSH_NULL())
    })
  })

  describe('Identifier', () => {
    it('compiles undefined as PUSH_UNDEFINED', () => {
      const lines = getInstructions('undefined;')
      expectInstruction(lines[0], { op: 'PUSH_UNDEFINED' })
    })

    it('compiles regular identifier as LOAD_VAR', () => {
      const lines = getInstructions('myVar;')
      expectInstruction(lines[0], { op: 'LOAD_VAR', args: ['myVar'] })
    })

    it('generates correct English narration for undefined', () => {
      const lines = getInstructions('undefined;')
      expect(lines[0].english).toBe(expectedNarrations.PUSH_UNDEFINED())
    })

    it('generates correct English narration for variable', () => {
      const lines = getInstructions('x;')
      expect(lines[0].english).toBe(expectedNarrations.LOAD_VAR('x'))
    })
  })
})
