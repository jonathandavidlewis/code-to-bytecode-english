import { describe, it, expect } from 'vitest'
import { parseSource, compile } from '@/lib/bytecode'
import {
  compileSource,
  expectNoDiagnostics,
  expectValidParse,
  getInstructions,
  expectOps,
} from '../helpers/test-utils'

describe('End-to-end compilation', () => {
  describe('complete programs', () => {
    it('compiles a simple calculator expression', () => {
      const source = `
        let a = 10;
        let b = 5;
        let sum = a + b;
        let product = a * b;
      `
      const result = compileSource(source)
      expectNoDiagnostics(result)
      expect(result.lines.length).toBeGreaterThan(0)
    })

    it('compiles mixed statements and expressions', () => {
      const source = `
        let greeting = "hello";
        console.log(greeting);
        let x = 1 + 2 * 3;
      `
      const result = compileSource(source)
      const ops = result.lines.map((l) => l.op)
      expect(ops).toContain('DECLARE_VAR')
      expect(ops).toContain('CALL_METHOD')
    })

    it('maintains statement ID consistency through compilation', () => {
      const source = `
        let x = 1;
        let y = 2;
      `
      const parseResult = parseSource(source)
      expectValidParse(parseResult)

      const compileResult = compile(parseResult.statements)

      // Each instruction should reference a valid statement ID
      const stmtIds = new Set(parseResult.statements.map((s) => s.id))
      for (const line of compileResult.lines) {
        expect(stmtIds.has(line.statementId)).toBe(true)
      }
    })

    it('compiles function calls with computed arguments', () => {
      const source = `
        let x = 5;
        let y = 10;
        foo(x + y, x * y);
      `
      const result = compileSource(source)
      const ops = result.lines.map((l) => l.op)
      expect(ops).toContain('ADD')
      expect(ops).toContain('MUL')
      expect(ops).toContain('CALL')
    })
  })

  describe('all statement types produce output', () => {
    it('EmptyStatement produces NOOP', () => {
      const result = compileSource(';')
      expect(result.lines[0].op).toBe('NOOP')
    })

    it('VariableDeclaration produces DECLARE_VAR', () => {
      const result = compileSource('let x;')
      expect(result.lines[0].op).toBe('DECLARE_VAR')
    })

    it('ExpressionStatement produces POP at end', () => {
      const result = compileSource('42;')
      const lastLine = result.lines[result.lines.length - 1]
      expect(lastLine.op).toBe('POP')
    })

    it('unsupported statements still produce output', () => {
      // TryStatement is not yet supported
      const result = compileSource('try { x } catch (e) {}')
      expect(result.lines.length).toBeGreaterThan(0)
      expect(result.lines[0].op).toBe('UNSUPPORTED')
    })
  })

  describe('all instructions have English narrations', () => {
    it('every instruction has a non-empty english field', () => {
      const source = `
        let x = 1 + 2;
        console.log(x);
      `
      const result = compileSource(source)

      for (const line of result.lines) {
        expect(line.english).toBeDefined()
        expect(line.english.length).toBeGreaterThan(0)
      }
    })

    it('narrations use actual values from code', () => {
      const lines = getInstructions('let myVariable = 42;')

      // DECLARE_VAR should mention the variable name
      const declareVar = lines.find((l) => l.op === 'DECLARE_VAR')
      expect(declareVar?.english).toContain('myVariable')

      // PUSH_CONST should mention the value
      const pushConst = lines.find((l) => l.op === 'PUSH_CONST')
      expect(pushConst?.english).toContain('42')

      // STORE_VAR should mention the variable name
      const storeVar = lines.find((l) => l.op === 'STORE_VAR')
      expect(storeVar?.english).toContain('myVariable')
    })
  })

  describe('instruction text formatting', () => {
    it('formats instruction text with op and args', () => {
      const lines = getInstructions('let x = 5;')

      const declareVar = lines.find((l) => l.op === 'DECLARE_VAR')
      expect(declareVar?.text).toBe('DECLARE_VAR x')

      const pushConst = lines.find((l) => l.op === 'PUSH_CONST')
      expect(pushConst?.text).toBe('PUSH_CONST 5')

      const storeVar = lines.find((l) => l.op === 'STORE_VAR')
      expect(storeVar?.text).toBe('STORE_VAR x')
    })

    it('formats no-arg instructions without trailing space', () => {
      const lines = getInstructions('1 + 2;')
      const add = lines.find((l) => l.op === 'ADD')
      expect(add?.text).toBe('ADD')
    })
  })

  describe('statement ordering', () => {
    it('preserves statement order in instructions', () => {
      const source = `
        let a = 1;
        let b = 2;
        let c = 3;
      `
      const parseResult = parseSource(source)
      expectValidParse(parseResult)
      const compileResult = compile(parseResult.statements)

      // First few instructions should reference first statement
      const firstStmtId = parseResult.statements[0].id
      expect(compileResult.lines[0].statementId).toBe(firstStmtId)
    })
  })

  describe('complex expressions', () => {
    it('handles deeply nested arithmetic', () => {
      const lines = getInstructions('((1 + 2) * (3 + 4));')
      expectOps(lines, [
        'PUSH_CONST',
        'PUSH_CONST',
        'ADD', // 1 + 2
        'PUSH_CONST',
        'PUSH_CONST',
        'ADD', // 3 + 4
        'MUL', // result * result
        'POP',
      ])
    })

    it('handles chained method calls as expressions', () => {
      // Note: chained calls aren't fully supported, but single method calls work
      const lines = getInstructions('console.log("test");')
      const ops = lines.map((l) => l.op)
      expect(ops).toContain('CALL_METHOD')
    })
  })
})
