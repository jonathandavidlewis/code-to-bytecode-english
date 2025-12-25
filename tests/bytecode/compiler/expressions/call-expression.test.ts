import { describe, it, expect } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectInstructionSequence,
  expectNoDiagnostics,
  expectDiagnostic,
  expectedNarrations,
  findByOp,
} from '../../helpers/test-utils'

describe('CallExpression compilation', () => {
  describe('simple function calls', () => {
    it('compiles call with no arguments', () => {
      const lines = getInstructions('foo();')
      expectInstructionSequence(lines, [{ op: 'CALL', args: ['foo', '0'] }, { op: 'POP' }])
    })

    it('compiles call with one argument', () => {
      const lines = getInstructions('print(42);')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['42'] },
        { op: 'CALL', args: ['print', '1'] },
        { op: 'POP' },
      ])
    })

    it('compiles call with multiple arguments', () => {
      const lines = getInstructions('add(1, 2, 3);')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['1'] },
        { op: 'PUSH_CONST', args: ['2'] },
        { op: 'PUSH_CONST', args: ['3'] },
        { op: 'CALL', args: ['add', '3'] },
        { op: 'POP' },
      ])
    })

    it('compiles call with expression arguments', () => {
      const lines = getInstructions('foo(1 + 2);')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['1'] },
        { op: 'PUSH_CONST', args: ['2'] },
        { op: 'ADD' },
        { op: 'CALL', args: ['foo', '1'] },
        { op: 'POP' },
      ])
    })

    it('compiles call with variable arguments', () => {
      const lines = getInstructions('foo(x, y);')
      expectInstructionSequence(lines, [
        { op: 'LOAD_VAR', args: ['x'] },
        { op: 'LOAD_VAR', args: ['y'] },
        { op: 'CALL', args: ['foo', '2'] },
        { op: 'POP' },
      ])
    })
  })

  describe('method calls', () => {
    it('compiles method call with no arguments', () => {
      const lines = getInstructions('obj.method();')
      expectInstructionSequence(lines, [
        { op: 'LOAD_VAR', args: ['obj'] },
        { op: 'CALL_METHOD', args: ['obj', 'method', '0'] },
        { op: 'POP' },
      ])
    })

    it('compiles method call with arguments', () => {
      const lines = getInstructions('console.log("hello");')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['"hello"'] },
        { op: 'LOAD_VAR', args: ['console'] },
        { op: 'CALL_METHOD', args: ['console', 'log', '1'] },
        { op: 'POP' },
      ])
    })

    it('compiles method call with multiple arguments', () => {
      const lines = getInstructions('math.add(1, 2);')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['1'] },
        { op: 'PUSH_CONST', args: ['2'] },
        { op: 'LOAD_VAR', args: ['math'] },
        { op: 'CALL_METHOD', args: ['math', 'add', '2'] },
        { op: 'POP' },
      ])
    })
  })

  describe('English narrations', () => {
    it('generates correct CALL narration for no args', () => {
      const lines = getInstructions('foo();')
      const callLine = findByOp(lines, 'CALL')[0]
      expect(callLine.english).toBe(expectedNarrations.CALL('foo', '0'))
    })

    it('generates correct CALL narration for multiple args', () => {
      const lines = getInstructions('foo(1, 2);')
      const callLine = findByOp(lines, 'CALL')[0]
      expect(callLine.english).toBe(expectedNarrations.CALL('foo', '2'))
    })

    it('generates correct CALL_METHOD narration', () => {
      const lines = getInstructions('console.log("test");')
      const callMethodLine = findByOp(lines, 'CALL_METHOD')[0]
      expect(callMethodLine.english).toBe(expectedNarrations.CALL_METHOD('console', 'log', '1'))
    })
  })

  describe('unsupported patterns', () => {
    it('generates diagnostic for computed member call', () => {
      const result = compileSource('obj["method"]();')
      expectDiagnostic(result.diagnostics, 'Computed member call')
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for simple function calls', () => {
      const result = compileSource('foo(1, 2);')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for method calls', () => {
      const result = compileSource('console.log("test");')
      expectNoDiagnostics(result)
    })
  })
})
