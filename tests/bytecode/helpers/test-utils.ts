import { parseSource, compile, resetLabelCounter, resetBreakTargetStack } from '@/lib/bytecode'
import type {
  ParseStatus,
  StatementBlock,
  InstructionLine,
  CompileResult,
  CompileDiagnostic,
} from '@/lib/bytecode/types'
import { expect } from 'vitest'

// ============================================================================
// Compilation Helpers
// ============================================================================

/**
 * Parse source code and assert it's valid, returning statements
 */
export function parseValid(source: string): StatementBlock[] {
  const result = parseSource(source)
  if (result.kind !== 'valid') {
    throw new Error(`Expected valid parse, got error: ${result.error.message}`)
  }
  return result.statements
}

/**
 * Full pipeline: parse + compile source code
 */
export function compileSource(source: string): CompileResult {
  const statements = parseValid(source)
  return compile(statements)
}

/**
 * Compile and return just the instruction lines
 */
export function getInstructions(source: string): InstructionLine[] {
  return compileSource(source).lines
}

/**
 * Compile and return just the diagnostics
 */
export function getDiagnostics(source: string): CompileDiagnostic[] {
  return compileSource(source).diagnostics
}

// ============================================================================
// Instruction Assertion Helpers
// ============================================================================

/**
 * Assert that instructions contain the expected operations in order
 */
export function expectOps(lines: InstructionLine[], expectedOps: string[]): void {
  const actualOps = lines.map((l) => l.op)
  expect(actualOps).toEqual(expectedOps)
}

/**
 * Assert that a single instruction matches expected values
 */
export function expectInstruction(
  line: InstructionLine,
  expected: {
    op: string
    args?: string[]
    textContains?: string
    englishContains?: string
  }
): void {
  expect(line.op).toBe(expected.op)

  if (expected.args !== undefined) {
    expect(line.args).toEqual(expected.args)
  }

  if (expected.textContains !== undefined) {
    expect(line.text).toContain(expected.textContains)
  }

  if (expected.englishContains !== undefined) {
    expect(line.english).toContain(expected.englishContains)
  }
}

/**
 * Assert that instructions match a sequence of expected patterns
 */
export function expectInstructionSequence(
  lines: InstructionLine[],
  expected: Array<{
    op: string
    args?: string[]
  }>
): void {
  expect(lines.length).toBe(expected.length)

  expected.forEach((exp, index) => {
    expect(lines[index].op).toBe(exp.op)
    if (exp.args !== undefined) {
      expect(lines[index].args).toEqual(exp.args)
    }
  })
}

/**
 * Find instructions by operation type
 */
export function findByOp(lines: InstructionLine[], op: string): InstructionLine[] {
  return lines.filter((l) => l.op === op)
}

/**
 * Assert no diagnostics were generated (clean compile)
 */
export function expectNoDiagnostics(result: CompileResult): void {
  expect(result.diagnostics).toHaveLength(0)
}

/**
 * Assert specific diagnostic message exists
 */
export function expectDiagnostic(diagnostics: CompileDiagnostic[], messageContains: string): void {
  const found = diagnostics.some((d) => d.message.includes(messageContains))
  expect(found).toBe(true)
}

// ============================================================================
// Parser Assertion Helpers
// ============================================================================

/**
 * Assert parse result is valid
 */
export function expectValidParse(
  result: ParseStatus
): asserts result is Extract<ParseStatus, { kind: 'valid' }> {
  expect(result.kind).toBe('valid')
}

/**
 * Assert parse result is invalid
 */
export function expectInvalidParse(
  result: ParseStatus
): asserts result is Extract<ParseStatus, { kind: 'invalid' }> {
  expect(result.kind).toBe('invalid')
}

/**
 * Assert the correct number of statements were parsed
 */
export function expectStatementCount(statements: StatementBlock[], count: number): void {
  expect(statements).toHaveLength(count)
}

/**
 * Assert statement has correct colorBand (alternating pattern)
 */
export function expectColorBanding(statements: StatementBlock[]): void {
  statements.forEach((stmt, index) => {
    expect(stmt.colorBand).toBe((index % 2) as 0 | 1)
  })
}

// ============================================================================
// English Narration Helpers
// ============================================================================

/**
 * Expected narration patterns matching compiler.ts exactly
 */
export const expectedNarrations = {
  PUSH_CONST: (value: string) => `Push the constant value ${value} onto the stack.`,
  LOAD_VAR: (name: string) => `Load the value of '${name}' and push it onto the stack.`,
  STORE_VAR: (name: string) =>
    `Pop the top of the stack and store it in the variable named '${name}'.`,
  DECLARE_VAR: (name: string) => `Declare a new variable named '${name}'.`,
  ADD: () => 'Pop the top two values, add them, and push the result.',
  SUB: () => 'Pop the top two values, subtract the second from the first, and push the result.',
  MUL: () => 'Pop the top two values, multiply them, and push the result.',
  DIV: () => 'Pop the top two values, divide the first by the second, and push the result.',
  MOD: () => 'Pop the top two values, compute the remainder, and push the result.',
  EQ: () => 'Pop the top two values, compare for equality, and push the boolean result.',
  NEQ: () => 'Pop the top two values, compare for inequality, and push the boolean result.',
  LT: () => 'Pop the top two values, check if first is less than second, and push the result.',
  GT: () => 'Pop the top two values, check if first is greater than second, and push the result.',
  LTE: () => 'Pop the top two values, check if first is less than or equal, and push the result.',
  GTE: () =>
    'Pop the top two values, check if first is greater than or equal, and push the result.',
  POP: () => 'Pop and discard the top value from the stack.',
  CALL: (name: string, argCount: string) =>
    `Call the function '${name}' with ${argCount} argument(s).`,
  CALL_METHOD: (object: string, method: string, argCount: string) =>
    `Call the method '${method}' on '${object}' with ${argCount} argument(s).`,
  GET_PROP: (prop: string) => `Get the property '${prop}' from the object on top of the stack.`,
  NOOP: () => 'No operation - this statement has no effect.',
  PUSH_UNDEFINED: () => "Push the value 'undefined' onto the stack.",
  PUSH_NULL: () => "Push the value 'null' onto the stack.",
  // Control flow
  LABEL: (label: string) => `Mark position '${label}' as a jump target.`,
  JUMP: (label: string) => `Jump to position '${label}'.`,
  JUMP_IF_FALSE: (label: string) => `Pop the top value; if false, jump to '${label}'.`,
  // Iterator operations
  GET_KEYS: () => 'Get the enumerable keys of the object on the stack and push an iterator.',
  GET_ITERATOR: () => 'Get an iterator for the iterable on the stack.',
  ITER_NEXT: (varName: string) => `Get the next value from the iterator and store it in '${varName}'.`,
  ITER_HAS_NEXT: () => 'Check if the iterator has more items; push true or false.',
  // Update operations
  INCREMENT: (varName: string) => `Increment the value of '${varName}' by 1.`,
  DECREMENT: (varName: string) => `Decrement the value of '${varName}' by 1.`,
  // Array operations
  CREATE_ARRAY: (count: string) => `Create a new array with ${count} element(s).`,
  SPREAD: () => 'Spread the array on top of the stack into individual elements.',
  // Object operations
  CREATE_OBJECT: (count: string) => `Create a new object with ${count} properties.`,
  SET_PROP: (name: string) => `Set the property '${name}' on the object.`,
  GET_COMPUTED_PROP: () => 'Get property using the key on top of the stack.',
  SET_COMPUTED_PROP: () => 'Set property using the key and value on top of the stack.',
  // String operations
  CONCAT_STRINGS: (count: string) => `Concatenate ${count} string(s) from the stack.`,
  TO_STRING: () => 'Convert the top value to a string.',
  // Stack operations
  DUP: () => 'Duplicate the top value on the stack.',
  // Additional control flow
  JUMP_IF_TRUE: (label: string) => `Pop the top value; if true, jump to '${label}'.`,
  // Import operations
  IMPORT: (localName: string, source: string) => `Import '${localName}' from module '${source}'.`,
  IMPORT_AS: (original: string, local: string, source: string) =>
    `Import '${local}' (originally '${original}') from module '${source}'.`,
  IMPORT_DEFAULT: (name: string, source: string) =>
    `Import the default export as '${name}' from module '${source}'.`,
  IMPORT_NAMESPACE: (name: string, source: string) =>
    `Import all exports from '${source}' as namespace '${name}'.`,
  // Export operations
  EXPORT: (name: string) => `Export '${name}' from this module.`,
  EXPORT_AS: (local: string, exported: string) =>
    `Export '${local}' as '${exported}' from this module.`,
  // Function operations
  DECLARE_FUNC: (name: string, paramCount: string) =>
    `Declare function '${name}' that takes ${paramCount} parameter(s).`,
  PARAM: (name: string, index: string) =>
    `Bind parameter '${name}' (argument ${index}) to a local variable.`,
  RETURN: () => 'Return the value on top of the stack to the caller.',
  RETURN_UNDEFINED: () => 'Return undefined to the caller (implicit return).',
}

// Re-export reset functions for test setup
export { resetLabelCounter, resetBreakTargetStack }

/**
 * Assert that an instruction has the expected English narration
 */
export function expectNarration(line: InstructionLine, expected: string): void {
  expect(line.english).toBe(expected)
}
