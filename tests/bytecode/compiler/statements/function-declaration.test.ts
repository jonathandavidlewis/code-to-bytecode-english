import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  findByOp,
  expectNoDiagnostics,
  resetLabelCounter,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('FunctionDeclaration compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
  })

  describe('basic function', () => {
    it('compiles function with no parameters', () => {
      const lines = getInstructions('function foo() { x; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('DECLARE_FUNC')
      expect(ops).toContain('LABEL') // function start
      expect(ops).toContain('RETURN_UNDEFINED') // implicit return
    })

    it('compiles function with parameters', () => {
      const lines = getInstructions('function add(a, b) { a; }')

      const declareFunc = findByOp(lines, 'DECLARE_FUNC')[0]
      expect(declareFunc.args).toEqual(['add', '2'])

      const params = findByOp(lines, 'PARAM')
      expect(params.length).toBe(2)
      expect(params[0].args).toEqual(['a', '0'])
      expect(params[1].args).toEqual(['b', '1'])
    })

    it('compiles function body', () => {
      const lines = getInstructions('function foo() { x; y; }')

      const loadVars = findByOp(lines, 'LOAD_VAR')
      expect(loadVars.some((l) => l.args[0] === 'x')).toBe(true)
      expect(loadVars.some((l) => l.args[0] === 'y')).toBe(true)
    })

    it('has function start and end labels', () => {
      const lines = getInstructions('function foo() { x; }')
      const labels = findByOp(lines, 'LABEL')
      expect(labels.length).toBe(2) // start and end
      expect(labels[0].args[0]).toContain('func_foo')
      expect(labels[1].args[0]).toContain('func_foo_end')
    })
  })

  describe('parameters', () => {
    it('binds parameters in order', () => {
      const lines = getInstructions('function test(a, b, c) { a; }')
      const params = findByOp(lines, 'PARAM')

      expect(params[0].args).toEqual(['a', '0'])
      expect(params[1].args).toEqual(['b', '1'])
      expect(params[2].args).toEqual(['c', '2'])
    })

    it('handles multiple parameters', () => {
      const lines = getInstructions('function test(a, b, c, d) { a; }')
      const params = findByOp(lines, 'PARAM')
      expect(params.length).toBe(4)
    })
  })

  describe('return statements', () => {
    it('compiles return with value', () => {
      const lines = getInstructions('function foo() { return 42; }')
      const ops = lines.map((l) => l.op)

      expect(ops).toContain('PUSH_CONST')
      expect(ops).toContain('RETURN')
    })

    it('compiles return without value', () => {
      const lines = getInstructions('function foo() { return; }')
      const returnUndefs = findByOp(lines, 'RETURN_UNDEFINED')
      // Should have at least one (explicit return) plus one (implicit return at end)
      expect(returnUndefs.length).toBeGreaterThanOrEqual(1)
    })

    it('adds implicit return undefined', () => {
      const lines = getInstructions('function foo() { x; }')

      // Last instruction before end label should be RETURN_UNDEFINED
      const returnUndefs = findByOp(lines, 'RETURN_UNDEFINED')
      expect(returnUndefs.length).toBe(1)
    })

    it('compiles return with expression', () => {
      const lines = getInstructions('function add(a, b) { return a + b; }')

      expect(findByOp(lines, 'ADD').length).toBe(1)
      expect(findByOp(lines, 'RETURN').length).toBe(1)
    })
  })

  describe('English narrations', () => {
    it('generates correct DECLARE_FUNC narration', () => {
      const lines = getInstructions('function test(a, b) { a; }')
      const declareFunc = findByOp(lines, 'DECLARE_FUNC')[0]
      expect(declareFunc.english).toBe(expectedNarrations.DECLARE_FUNC('test', '2'))
    })

    it('generates correct PARAM narration', () => {
      const lines = getInstructions('function test(x) { x; }')
      const param = findByOp(lines, 'PARAM')[0]
      expect(param.english).toBe(expectedNarrations.PARAM('x', '0'))
    })

    it('generates correct RETURN narration', () => {
      const lines = getInstructions('function foo() { return 1; }')
      const returnOp = findByOp(lines, 'RETURN')[0]
      expect(returnOp.english).toBe(expectedNarrations.RETURN())
    })

    it('generates correct RETURN_UNDEFINED narration', () => {
      const lines = getInstructions('function foo() { x; }')
      const returnUndef = findByOp(lines, 'RETURN_UNDEFINED')[0]
      expect(returnUndef.english).toBe(expectedNarrations.RETURN_UNDEFINED())
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for simple function', () => {
      const result = compileSource('function foo() { x; }')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for function with parameters', () => {
      const result = compileSource('function add(a, b) { return a + b; }')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for function with return', () => {
      const result = compileSource('function getValue() { return 42; }')
      expectNoDiagnostics(result)
    })
  })
})
