import { describe, it, expect, beforeEach } from 'vitest'
import {
  getInstructions,
  compileSource,
  findByOp,
  expectNoDiagnostics,
  resetLabelCounter,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('ExportNamedDeclaration compilation', () => {
  beforeEach(() => {
    resetLabelCounter()
  })

  describe('export with declaration', () => {
    it('compiles export const', () => {
      const lines = getInstructions('export const x = 42;')

      // Should have variable declaration instructions
      expect(findByOp(lines, 'DECLARE_VAR').length).toBe(1)
      expect(findByOp(lines, 'PUSH_CONST').length).toBe(1)
      expect(findByOp(lines, 'STORE_VAR').length).toBe(1)

      // Should have export instruction
      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(1)
      expect(exports[0].args).toEqual(['x'])
    })

    it('compiles export function', () => {
      const lines = getInstructions('export function foo() { return 1; }')

      // Should have function declaration
      expect(findByOp(lines, 'DECLARE_FUNC').length).toBe(1)

      // Should have export instruction
      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(1)
      expect(exports[0].args).toEqual(['foo'])
    })

    it('compiles export let', () => {
      const lines = getInstructions('export let y = 10;')

      expect(findByOp(lines, 'DECLARE_VAR').length).toBe(1)
      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(1)
      expect(exports[0].args).toEqual(['y'])
    })

    it('compiles export with multiple declarators', () => {
      const lines = getInstructions('export const a = 1, b = 2;')

      expect(findByOp(lines, 'DECLARE_VAR').length).toBe(2)
      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(2)
      expect(exports[0].args).toEqual(['a'])
      expect(exports[1].args).toEqual(['b'])
    })
  })

  describe('export specifiers', () => {
    it('compiles export { name }', () => {
      // First declare the variable, then export it
      const lines = getInstructions('let foo = 1; export { foo };')

      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(1)
      expect(exports[0].args).toEqual(['foo'])
    })

    it('compiles export { name as alias }', () => {
      const lines = getInstructions('let foo = 1; export { foo as bar };')

      const exportAs = findByOp(lines, 'EXPORT_AS')
      expect(exportAs.length).toBe(1)
      expect(exportAs[0].args).toEqual(['foo', 'bar'])
    })

    it('compiles export with multiple specifiers', () => {
      const lines = getInstructions('let a = 1, b = 2; export { a, b };')

      const exports = findByOp(lines, 'EXPORT')
      expect(exports.length).toBe(2)
    })

    it('compiles mixed export specifiers', () => {
      const lines = getInstructions('let a = 1, b = 2; export { a, b as c };')

      const exports = findByOp(lines, 'EXPORT')
      const exportAs = findByOp(lines, 'EXPORT_AS')

      expect(exports.length).toBe(1)
      expect(exportAs.length).toBe(1)
    })
  })

  describe('English narrations', () => {
    it('generates correct EXPORT narration', () => {
      const lines = getInstructions('export const x = 1;')
      const exportOp = findByOp(lines, 'EXPORT')[0]
      expect(exportOp.english).toBe(expectedNarrations.EXPORT('x'))
    })

    it('generates correct EXPORT_AS narration', () => {
      const lines = getInstructions('let x = 1; export { x as y };')
      const exportAs = findByOp(lines, 'EXPORT_AS')[0]
      expect(exportAs.english).toBe(expectedNarrations.EXPORT_AS('x', 'y'))
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for export const', () => {
      const result = compileSource('export const x = 42;')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for export function', () => {
      const result = compileSource('export function foo() { return 1; }')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for export specifiers', () => {
      const result = compileSource('let x = 1; export { x };')
      expectNoDiagnostics(result)
    })
  })
})
