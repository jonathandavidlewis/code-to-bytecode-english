/**
 * Performance test fixtures - large inputs for stress testing
 */

/**
 * Generate a switch statement with N cases
 */
export function generateSwitchStatement(caseCount: number): string {
  const cases = Array.from(
    { length: caseCount },
    (_, i) => `    case "${i}": {
      const lit = node as BabelNode & { value: number }
      lines.push(createInstruction(statementId, "PUSH_CONST", [String(lit.value)]))
      break
    }`
  ).join("\n\n")

  return `switch (node.type) {
${cases}

    default: {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
    }
  }`
}

/**
 * Generate N variable declarations
 */
export function generateStatements(count: number): string {
  return Array.from({ length: count }, (_, i) => `const var${i} = ${i} + ${i * 2};`).join("\n")
}

/**
 * Generate N-deep nested for-in loops
 */
export function generateNestedLoops(depth: number): string {
  let code = ""
  let indent = ""

  for (let i = 0; i < depth; i++) {
    code += `${indent}for (const key${i} in obj${i}) {\n`
    indent += "  "
  }

  code += `${indent}console.log("deep");\n`

  for (let i = depth - 1; i >= 0; i--) {
    indent = indent.slice(2)
    code += `${indent}}\n`
  }

  return code
}

/**
 * Generate a function with many parameters and local variables
 */
export function generateLargeFunction(paramCount: number, localCount: number): string {
  const params = Array.from({ length: paramCount }, (_, i) => `p${i}`).join(", ")
  const locals = Array.from({ length: localCount }, (_, i) => `  const local${i} = p${i % paramCount} + ${i};`).join(
    "\n"
  )

  return `function largeFunc(${params}) {
${locals}
  return local0;
}`
}

// Pre-generated fixtures for common test cases
export const LARGE_SWITCH_50_CASES = generateSwitchStatement(50)
export const LARGE_SWITCH_100_CASES = generateSwitchStatement(100)

export const STATEMENTS_50 = generateStatements(50)
export const STATEMENTS_100 = generateStatements(100)
export const STATEMENTS_500 = generateStatements(500)

export const NESTED_LOOPS_5_DEEP = generateNestedLoops(5)
export const NESTED_LOOPS_10_DEEP = generateNestedLoops(10)

export const LARGE_FUNCTION_20_PARAMS = generateLargeFunction(20, 50)

// The exact problematic input from the user's report
export const PROBLEMATIC_SWITCH_INPUT = `switch (node.type) {
    case "NumericLiteral": {
      const lit = node as BabelNode & { value: number }
      lines.push(createInstruction(statementId, "PUSH_CONST", [String(lit.value)]))
      break
    }

    case "StringLiteral": {
      const lit = node as BabelNode & { value: string }
      lines.push(createInstruction(statementId, "PUSH_CONST", ["\${lit.value}"]))
      break
    }

    case "BooleanLiteral": {
      const lit = node as BabelNode & { value: boolean }
      lines.push(createInstruction(statementId, "PUSH_CONST", [String(lit.value)]))
      break
    }

    case "NullLiteral": {
      lines.push(createInstruction(statementId, "PUSH_NULL"))
      break
    }

    case "ArrayExpression": {
      const arr = node as BabelNode & { elements: (BabelNode | null)[] }
      for (const elem of arr.elements) {
        if (elem === null) {
          lines.push(createInstruction(statementId, "PUSH_UNDEFINED"))
        } else if (elem.type === "SpreadElement") {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["SpreadElement"]))
        } else {
          lines.push(...compileExpression(elem, statementId, diagnostics))
        }
      }
      lines.push(createInstruction(statementId, "CREATE_ARRAY", [String(arr.elements.length)]))
      break
    }

    case "Identifier": {
      const id = node as BabelNode & { name: string }
      if (id.name === "undefined") {
        lines.push(createInstruction(statementId, "PUSH_UNDEFINED"))
      } else {
        lines.push(createInstruction(statementId, "LOAD_VAR", [id.name]))
      }
      break
    }

    default: {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
    }
  }`
