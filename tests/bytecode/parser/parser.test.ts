import { describe, it, expect } from 'vitest'
import { parseSource } from '@/lib/bytecode'
import {
  expectValidParse,
  expectInvalidParse,
  expectStatementCount,
  expectColorBanding,
} from '../helpers/test-utils'

describe('parseSource', () => {
  describe('valid source code', () => {
    it('parses empty source as valid with no statements', () => {
      const result = parseSource('')
      expectValidParse(result)
      expectStatementCount(result.statements, 0)
    })

    it('parses a single variable declaration', () => {
      const result = parseSource('let x = 42;')
      expectValidParse(result)
      expectStatementCount(result.statements, 1)
      expect(result.statements[0].node.type).toBe('VariableDeclaration')
    })

    it('parses multiple statements', () => {
      const source = `
        let a = 1;
        let b = 2;
        let c = a + b;
      `
      const result = parseSource(source)
      expectValidParse(result)
      expectStatementCount(result.statements, 3)
    })

    it('assigns correct colorBand alternation', () => {
      const source = `
        let a = 1;
        let b = 2;
        let c = 3;
        let d = 4;
      `
      const result = parseSource(source)
      expectValidParse(result)
      expectColorBanding(result.statements)
    })

    it('generates unique statement IDs', () => {
      const source = `
        let a = 1;
        let b = 2;
      `
      const result = parseSource(source)
      expectValidParse(result)
      const ids = result.statements.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('captures correct source locations', () => {
      const result = parseSource('let x = 42;')
      expectValidParse(result)
      const stmt = result.statements[0]
      expect(stmt.loc.start.line).toBe(1)
      expect(stmt.loc.start.column).toBe(0)
    })

    it('parses expression statements', () => {
      const result = parseSource('1 + 2;')
      expectValidParse(result)
      expectStatementCount(result.statements, 1)
      expect(result.statements[0].node.type).toBe('ExpressionStatement')
    })

    it('parses function calls', () => {
      const result = parseSource('console.log("hello");')
      expectValidParse(result)
      expectStatementCount(result.statements, 1)
    })

    it('includes AST in result', () => {
      const result = parseSource('let x = 1;')
      expectValidParse(result)
      expect(result.ast).toBeDefined()
      expect(result.ast.type).toBe('Program')
      expect(result.ast.body.length).toBe(1)
    })
  })

  describe('invalid source code', () => {
    it('returns invalid for syntax errors', () => {
      const result = parseSource('let = 42;')
      expectInvalidParse(result)
      expect(result.error.message).toBeDefined()
    })

    it('returns invalid for unclosed brackets', () => {
      const result = parseSource('let x = { a: 1')
      expectInvalidParse(result)
    })

    it('returns invalid for unclosed parentheses', () => {
      const result = parseSource('console.log("test"')
      expectInvalidParse(result)
    })

    it('provides error location when available', () => {
      const result = parseSource('let = 42;')
      expectInvalidParse(result)
      expect(result.error.loc).toBeDefined()
    })

    it('returns invalid for unexpected tokens', () => {
      const result = parseSource('let x = ;')
      expectInvalidParse(result)
    })
  })

  describe('statement index tracking', () => {
    it('assigns sequential indices starting from 0', () => {
      const source = `
        let a = 1;
        let b = 2;
        let c = 3;
      `
      const result = parseSource(source)
      expectValidParse(result)
      expect(result.statements[0].index).toBe(0)
      expect(result.statements[1].index).toBe(1)
      expect(result.statements[2].index).toBe(2)
    })
  })

  describe('statement ID format', () => {
    it('creates IDs with stmt-{index}-{line}-{column} format', () => {
      const result = parseSource('let x = 1;')
      expectValidParse(result)
      const id = result.statements[0].id
      expect(id).toMatch(/^stmt-\d+-\d+-\d+$/)
    })
  })
})
