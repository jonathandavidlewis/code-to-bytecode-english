import { describe, it, expect } from 'vitest'
import {
  getInstructions,
  compileSource,
  expectOps,
  findByOp,
  expectNoDiagnostics,
  expectedNarrations,
} from '../../helpers/test-utils'

describe('ImportDeclaration compilation', () => {
  describe('named imports', () => {
    it('compiles single named import', () => {
      const lines = getInstructions('import { foo } from "module";')
      expectOps(lines, ['IMPORT'])
      expect(lines[0].args).toEqual(['foo', 'module'])
    })

    it('compiles multiple named imports', () => {
      const lines = getInstructions('import { foo, bar } from "module";')
      expectOps(lines, ['IMPORT', 'IMPORT'])
      expect(lines[0].args).toEqual(['foo', 'module'])
      expect(lines[1].args).toEqual(['bar', 'module'])
    })

    it('compiles aliased import', () => {
      const lines = getInstructions('import { foo as baz } from "module";')
      expectOps(lines, ['IMPORT_AS'])
      expect(lines[0].args).toEqual(['foo', 'baz', 'module'])
    })

    it('compiles mixed named and aliased imports', () => {
      const lines = getInstructions('import { foo, bar as baz } from "module";')
      expectOps(lines, ['IMPORT', 'IMPORT_AS'])
    })
  })

  describe('default imports', () => {
    it('compiles default import', () => {
      const lines = getInstructions('import React from "react";')
      expectOps(lines, ['IMPORT_DEFAULT'])
      expect(lines[0].args).toEqual(['React', 'react'])
    })

    it('compiles default with named imports', () => {
      const lines = getInstructions('import React, { useState } from "react";')
      const ops = lines.map((l) => l.op)
      expect(ops).toContain('IMPORT_DEFAULT')
      expect(ops).toContain('IMPORT')
    })
  })

  describe('namespace imports', () => {
    it('compiles namespace import', () => {
      const lines = getInstructions('import * as utils from "utils";')
      expectOps(lines, ['IMPORT_NAMESPACE'])
      expect(lines[0].args).toEqual(['utils', 'utils'])
    })
  })

  describe('English narrations', () => {
    it('generates correct IMPORT narration', () => {
      const lines = getInstructions('import { foo } from "module";')
      expect(lines[0].english).toBe(expectedNarrations.IMPORT('foo', 'module'))
    })

    it('generates correct IMPORT_AS narration', () => {
      const lines = getInstructions('import { foo as bar } from "module";')
      expect(lines[0].english).toBe(expectedNarrations.IMPORT_AS('foo', 'bar', 'module'))
    })

    it('generates correct IMPORT_DEFAULT narration', () => {
      const lines = getInstructions('import React from "react";')
      expect(lines[0].english).toBe(expectedNarrations.IMPORT_DEFAULT('React', 'react'))
    })

    it('generates correct IMPORT_NAMESPACE narration', () => {
      const lines = getInstructions('import * as utils from "utils";')
      expect(lines[0].english).toBe(expectedNarrations.IMPORT_NAMESPACE('utils', 'utils'))
    })
  })

  describe('diagnostics', () => {
    it('produces no diagnostics for valid import', () => {
      const result = compileSource('import { foo } from "bar";')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for default import', () => {
      const result = compileSource('import foo from "bar";')
      expectNoDiagnostics(result)
    })

    it('produces no diagnostics for namespace import', () => {
      const result = compileSource('import * as foo from "bar";')
      expectNoDiagnostics(result)
    })
  })
})
