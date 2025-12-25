import { describe, it, expect } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  expectInstructionSequence,
  expectNoDiagnostics,
  expectDiagnostic,
  expectedNarrations,
  findByOp,
} from '../../helpers/test-utils'

describe('BinaryExpression compilation', () => {
  describe('arithmetic operators', () => {
    it('compiles addition', () => {
      const lines = getInstructions('1 + 2;')
      expectInstructionSequence(lines, [
        { op: 'PUSH_CONST', args: ['1'] },
        { op: 'PUSH_CONST', args: ['2'] },
        { op: 'ADD' },
        { op: 'POP' },
      ])
    })

    it('compiles subtraction', () => {
      const lines = getInstructions('5 - 3;')
      expectOps(lines, ['PUSH_CONST', 'PUSH_CONST', 'SUB', 'POP'])
    })

    it('compiles multiplication', () => {
      const lines = getInstructions('4 * 3;')
      expectOps(lines, ['PUSH_CONST', 'PUSH_CONST', 'MUL', 'POP'])
    })

    it('compiles division', () => {
      const lines = getInstructions('10 / 2;')
      expectOps(lines, ['PUSH_CONST', 'PUSH_CONST', 'DIV', 'POP'])
    })

    it('compiles modulo', () => {
      const lines = getInstructions('10 % 3;')
      expectOps(lines, ['PUSH_CONST', 'PUSH_CONST', 'MOD', 'POP'])
    })
  })

  describe('comparison operators', () => {
    it('compiles == as EQ', () => {
      const lines = getInstructions('a == b;')
      expect(lines.map((l) => l.op)).toContain('EQ')
    })

    it('compiles === as EQ', () => {
      const lines = getInstructions('a === b;')
      expect(lines.map((l) => l.op)).toContain('EQ')
    })

    it('compiles != as NEQ', () => {
      const lines = getInstructions('a != b;')
      expect(lines.map((l) => l.op)).toContain('NEQ')
    })

    it('compiles !== as NEQ', () => {
      const lines = getInstructions('a !== b;')
      expect(lines.map((l) => l.op)).toContain('NEQ')
    })

    it('compiles < as LT', () => {
      const lines = getInstructions('a < b;')
      expect(lines.map((l) => l.op)).toContain('LT')
    })

    it('compiles > as GT', () => {
      const lines = getInstructions('a > b;')
      expect(lines.map((l) => l.op)).toContain('GT')
    })

    it('compiles <= as LTE', () => {
      const lines = getInstructions('a <= b;')
      expect(lines.map((l) => l.op)).toContain('LTE')
    })

    it('compiles >= as GTE', () => {
      const lines = getInstructions('a >= b;')
      expect(lines.map((l) => l.op)).toContain('GTE')
    })
  })

  describe('nested expressions', () => {
    it('compiles nested arithmetic correctly (left associativity)', () => {
      const lines = getInstructions('1 + 2 + 3;')
      // Should be: ((1 + 2) + 3) due to left associativity
      expectOps(lines, [
        'PUSH_CONST',
        'PUSH_CONST',
        'ADD', // 1 + 2
        'PUSH_CONST',
        'ADD', // + 3
        'POP',
      ])
    })

    it('compiles with variables', () => {
      const lines = getInstructions('x + y;')
      expectInstructionSequence(lines, [
        { op: 'LOAD_VAR', args: ['x'] },
        { op: 'LOAD_VAR', args: ['y'] },
        { op: 'ADD' },
        { op: 'POP' },
      ])
    })

    it('compiles mixed literals and variables', () => {
      const lines = getInstructions('x + 5;')
      expectInstructionSequence(lines, [
        { op: 'LOAD_VAR', args: ['x'] },
        { op: 'PUSH_CONST', args: ['5'] },
        { op: 'ADD' },
        { op: 'POP' },
      ])
    })

    it('respects operator precedence (mul before add)', () => {
      const lines = getInstructions('1 + 2 * 3;')
      // Should be: 1 + (2 * 3) due to precedence
      expectOps(lines, [
        'PUSH_CONST', // 1
        'PUSH_CONST', // 2
        'PUSH_CONST', // 3
        'MUL', // 2 * 3
        'ADD', // 1 + result
        'POP',
      ])
    })
  })

  describe('English narrations', () => {
    it('generates correct ADD narration', () => {
      const lines = getInstructions('1 + 2;')
      const addLine = findByOp(lines, 'ADD')[0]
      expect(addLine.english).toBe(expectedNarrations.ADD())
    })

    it('generates correct SUB narration', () => {
      const lines = getInstructions('1 - 2;')
      const subLine = findByOp(lines, 'SUB')[0]
      expect(subLine.english).toBe(expectedNarrations.SUB())
    })

    it('generates correct MUL narration', () => {
      const lines = getInstructions('2 * 3;')
      const mulLine = findByOp(lines, 'MUL')[0]
      expect(mulLine.english).toBe(expectedNarrations.MUL())
    })

    it('generates correct DIV narration', () => {
      const lines = getInstructions('6 / 2;')
      const divLine = findByOp(lines, 'DIV')[0]
      expect(divLine.english).toBe(expectedNarrations.DIV())
    })

    it('generates correct MOD narration', () => {
      const lines = getInstructions('7 % 3;')
      const modLine = findByOp(lines, 'MOD')[0]
      expect(modLine.english).toBe(expectedNarrations.MOD())
    })

    it('generates correct EQ narration', () => {
      const lines = getInstructions('a == b;')
      const eqLine = findByOp(lines, 'EQ')[0]
      expect(eqLine.english).toBe(expectedNarrations.EQ())
    })

    it('generates correct LT narration', () => {
      const lines = getInstructions('a < b;')
      const ltLine = findByOp(lines, 'LT')[0]
      expect(ltLine.english).toBe(expectedNarrations.LT())
    })
  })

  describe('unsupported operators', () => {
    it('generates diagnostic for bitwise AND', () => {
      const result = compileSource('a & b;')
      expectDiagnostic(result.diagnostics, 'Unsupported binary operator')
    })

    it('generates diagnostic for bitwise OR', () => {
      const result = compileSource('a | b;')
      expectDiagnostic(result.diagnostics, 'Unsupported binary operator')
    })

    it('logical AND is now supported', () => {
      const result = compileSource('a && b;')
      // LogicalExpression is now supported with short-circuit evaluation
      expectNoDiagnostics(result)
      const ops = result.lines.map((l) => l.op)
      expect(ops).toContain('DUP')
      expect(ops).toContain('JUMP_IF_FALSE')
    })

    it('logical OR is now supported', () => {
      const result = compileSource('a || b;')
      // LogicalExpression is now supported with short-circuit evaluation
      expectNoDiagnostics(result)
      const ops = result.lines.map((l) => l.op)
      expect(ops).toContain('DUP')
      expect(ops).toContain('JUMP_IF_TRUE')
    })

    it('marks unsupported operators with UNSUPPORTED op', () => {
      const lines = getInstructions('a ** b;')  // Exponentiation is not supported
      expect(lines.map((l) => l.op)).toContain('UNSUPPORTED')
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid arithmetic', () => {
      const result = compileSource('1 + 2 * 3;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for valid comparisons', () => {
      const result = compileSource('a < b;')
      expectNoDiagnostics(result)
    })
  })
})
