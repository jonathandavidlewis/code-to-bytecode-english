// Core types for the pedagogical bytecode teaching tool

import type { Node as BabelNode, SourceLocation } from "@babel/types"

// Parse state types
export type ParseStatus =
  | { kind: "valid"; ast: BabelProgram; statements: StatementBlock[] }
  | { kind: "invalid"; error: ParseError; lastValid?: { ast: BabelProgram; statements: StatementBlock[] } }

export type ParseError = {
  message: string
  loc?: { line: number; column: number }
  range?: { start: number; end: number }
}

export type BabelProgram = {
  type: "Program"
  body: BabelNode[]
  sourceType: string
  loc?: SourceLocation | null
}

// Statement block - the spine that drives banding across all columns
export type StatementBlock = {
  id: string
  index: number
  loc: SourceLoc
  node: BabelNode
  colorBand: 0 | 1
}

export type SourceLoc = {
  start: { line: number; column: number; index?: number }
  end: { line: number; column: number; index?: number }
}

// Compiled output types
export type InstructionLine = {
  statementId: string
  op: string
  args: string[]
  text: string
  english: string
}

export type CompileResult = {
  lines: InstructionLine[]
  diagnostics: CompileDiagnostic[]
}

export type CompileDiagnostic = {
  statementId: string
  message: string
}

// Grouped instructions for rendering
export type InstructionGroup = {
  statementId: string
  colorBand: 0 | 1
  lines: InstructionLine[]
}
