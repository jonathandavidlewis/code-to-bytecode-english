import type { Node as BabelNode } from "@babel/types"
import type { StatementBlock, InstructionLine, CompileResult, CompileDiagnostic } from "./types"

// Label counter for generating unique labels
let labelCounter = 0
function generateLabel(prefix: string): string {
  return `${prefix}_${labelCounter++}`
}

// Reset label counter (useful for testing)
export function resetLabelCounter(): void {
  labelCounter = 0
}

// Break target stack for switch statements
let breakTargetStack: string[] = []

// Reset break target stack (useful for testing)
export function resetBreakTargetStack(): void {
  breakTargetStack = []
}

// English narration templates
const narrations: Record<string, (args: string[]) => string> = {
  PUSH_CONST: (args) => `Push the constant value ${args[0]} onto the stack.`,
  LOAD_VAR: (args) => `Load the value of '${args[0]}' and push it onto the stack.`,
  STORE_VAR: (args) => `Pop the top of the stack and store it in the variable named '${args[0]}'.`,
  DECLARE_VAR: (args) => `Declare a new variable named '${args[0]}'.`,
  ADD: () => "Pop the top two values, add them, and push the result.",
  SUB: () => "Pop the top two values, subtract the second from the first, and push the result.",
  MUL: () => "Pop the top two values, multiply them, and push the result.",
  DIV: () => "Pop the top two values, divide the first by the second, and push the result.",
  MOD: () => "Pop the top two values, compute the remainder, and push the result.",
  EQ: () => "Pop the top two values, compare for equality, and push the boolean result.",
  NEQ: () => "Pop the top two values, compare for inequality, and push the boolean result.",
  LT: () => "Pop the top two values, check if first is less than second, and push the result.",
  GT: () => "Pop the top two values, check if first is greater than second, and push the result.",
  LTE: () => "Pop the top two values, check if first is less than or equal, and push the result.",
  GTE: () => "Pop the top two values, check if first is greater than or equal, and push the result.",
  POP: () => "Pop and discard the top value from the stack.",
  CALL: (args) => `Call the function '${args[0]}' with ${args[1]} argument(s).`,
  CALL_METHOD: (args) => `Call the method '${args[1]}' on '${args[0]}' with ${args[2]} argument(s).`,
  GET_PROP: (args) => `Get the property '${args[0]}' from the object on top of the stack.`,
  UNSUPPORTED: (args) => `This statement uses syntax not supported by the teaching VM yet: ${args[0]}.`,
  NOOP: () => "No operation - this statement has no effect.",
  PUSH_UNDEFINED: () => "Push the value 'undefined' onto the stack.",
  PUSH_NULL: () => "Push the value 'null' onto the stack.",
  // Control flow operations
  LABEL: (args) => `Mark position '${args[0]}' as a jump target.`,
  JUMP: (args) => `Jump to position '${args[0]}'.`,
  JUMP_IF_FALSE: (args) => `Pop the top value; if false, jump to '${args[0]}'.`,
  // Iterator operations for for-in/for-of loops
  GET_KEYS: () => "Get the enumerable keys of the object on the stack and push an iterator.",
  GET_ITERATOR: () => "Get an iterator for the iterable on the stack.",
  ITER_NEXT: (args) => `Get the next value from the iterator and store it in '${args[0]}'.`,
  ITER_HAS_NEXT: () => "Check if the iterator has more items; push true or false.",
  // Update operations
  INCREMENT: (args) => `Increment the value of '${args[0]}' by 1.`,
  DECREMENT: (args) => `Decrement the value of '${args[0]}' by 1.`,
  // Array operations
  CREATE_ARRAY: (args) => `Create a new array with ${args[0]} element(s).`,
  SPREAD: () => "Spread the array on top of the stack into individual elements.",
  // Object operations
  CREATE_OBJECT: (args) => `Create a new object with ${args[0]} properties.`,
  SET_PROP: (args) => `Set the property '${args[0]}' on the object.`,
  GET_COMPUTED_PROP: () => "Get property using the key on top of the stack.",
  SET_COMPUTED_PROP: () => "Set property using the key and value on top of the stack.",
  // String operations
  CONCAT_STRINGS: (args) => `Concatenate ${args[0]} string(s) from the stack.`,
  TO_STRING: () => "Convert the top value to a string.",
  // Logical operations
  LOGICAL_AND: (args) => `Evaluate left side; if falsy, skip to '${args[0]}', otherwise continue with right side.`,
  LOGICAL_OR: (args) => `Evaluate left side; if truthy, skip to '${args[0]}', otherwise continue with right side.`,
  NULLISH_COALESCE: (args) => `Evaluate left side; if null/undefined, continue with right side, otherwise skip to '${args[0]}'.`,
  // Stack operations
  DUP: () => "Duplicate the top value on the stack.",
  // Additional control flow
  JUMP_IF_TRUE: (args) => `Pop the top value; if true, jump to '${args[0]}'.`,
  // Import operations
  IMPORT: (args) => `Import '${args[0]}' from module '${args[1]}'.`,
  IMPORT_AS: (args) => `Import '${args[1]}' (originally '${args[0]}') from module '${args[2]}'.`,
  IMPORT_DEFAULT: (args) => `Import the default export as '${args[0]}' from module '${args[1]}'.`,
  IMPORT_NAMESPACE: (args) => `Import all exports from '${args[1]}' as namespace '${args[0]}'.`,
  // Export operations
  EXPORT: (args) => `Export '${args[0]}' from this module.`,
  EXPORT_AS: (args) => `Export '${args[0]}' as '${args[1]}' from this module.`,
  // Function operations
  DECLARE_FUNC: (args) => `Declare function '${args[0]}' that takes ${args[1]} parameter(s).`,
  PARAM: (args) => `Bind parameter '${args[0]}' (argument ${args[1]}) to a local variable.`,
  RETURN: () => "Return the value on top of the stack to the caller.",
  RETURN_UNDEFINED: () => "Return undefined to the caller (implicit return).",
}

function createInstruction(statementId: string, op: string, args: string[] = []): InstructionLine {
  const text = args.length > 0 ? `${op} ${args.join(" ")}` : op
  const narrate = narrations[op] || (() => `Execute ${op} operation.`)
  return {
    statementId,
    op,
    args,
    text,
    english: narrate(args),
  }
}

export function compile(statements: StatementBlock[]): CompileResult {
  const lines: InstructionLine[] = []
  const diagnostics: CompileDiagnostic[] = []

  for (const block of statements) {
    const blockLines = compileStatement(block.node, block.id, diagnostics)
    if (blockLines.length === 0) {
      // Ensure at least one line per statement for banding
      lines.push(createInstruction(block.id, "NOOP"))
    } else {
      lines.push(...blockLines)
    }
  }

  return { lines, diagnostics }
}

function compileStatement(node: BabelNode, statementId: string, diagnostics: CompileDiagnostic[]): InstructionLine[] {
  const lines: InstructionLine[] = []

  switch (node.type) {
    case "VariableDeclaration": {
      const decl = node as BabelNode & {
        declarations: Array<{
          id: { type: string; name?: string }
          init: BabelNode | null
        }>
      }
      for (const declarator of decl.declarations) {
        if (declarator.id.type === "Identifier" && declarator.id.name) {
          lines.push(createInstruction(statementId, "DECLARE_VAR", [declarator.id.name]))
          if (declarator.init) {
            lines.push(...compileExpression(declarator.init, statementId, diagnostics))
            lines.push(createInstruction(statementId, "STORE_VAR", [declarator.id.name]))
          }
        } else {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["DestructuringPattern"]))
          diagnostics.push({ statementId, message: "Destructuring patterns not supported" })
        }
      }
      break
    }

    case "ExpressionStatement": {
      const expr = node as BabelNode & { expression: BabelNode }
      lines.push(...compileExpression(expr.expression, statementId, diagnostics))
      lines.push(createInstruction(statementId, "POP"))
      break
    }

    case "FunctionDeclaration": {
      const funcDecl = node as BabelNode & {
        id: { name: string } | null
        params: Array<BabelNode & { name?: string; type: string }>
        body: BabelNode
      }

      const funcName = funcDecl.id?.name || "anonymous"
      const paramCount = funcDecl.params.length
      const funcLabel = generateLabel(`func_${funcName}`)
      const funcEndLabel = generateLabel(`func_${funcName}_end`)

      lines.push(createInstruction(statementId, "DECLARE_FUNC", [funcName, String(paramCount)]))
      lines.push(createInstruction(statementId, "LABEL", [funcLabel]))

      funcDecl.params.forEach((param: BabelNode & { name?: string; type: string }, index: number) => {
        if (param.type === "Identifier" && param.name) {
          lines.push(createInstruction(statementId, "PARAM", [param.name, String(index)]))
        } else {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexParameter"]))
          diagnostics.push({ statementId, message: "Complex parameters not supported" })
        }
      })

      lines.push(...compileBlock(funcDecl.body, statementId, diagnostics))
      lines.push(createInstruction(statementId, "RETURN_UNDEFINED"))
      lines.push(createInstruction(statementId, "LABEL", [funcEndLabel]))
      break
    }

    case "IfStatement": {
      const ifStmt = node as BabelNode & {
        test: BabelNode
        consequent: BabelNode
        alternate: BabelNode | null
      }

      if (ifStmt.alternate) {
        const elseLabel = generateLabel("if_else")
        const endLabel = generateLabel("if_end")
        lines.push(...compileExpression(ifStmt.test, statementId, diagnostics))
        lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [elseLabel]))
        lines.push(...compileBlock(ifStmt.consequent, statementId, diagnostics))
        lines.push(createInstruction(statementId, "JUMP", [endLabel]))
        lines.push(createInstruction(statementId, "LABEL", [elseLabel]))
        lines.push(...compileBlock(ifStmt.alternate, statementId, diagnostics))
        lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      } else {
        const endLabel = generateLabel("if_end")
        lines.push(...compileExpression(ifStmt.test, statementId, diagnostics))
        lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [endLabel]))
        lines.push(...compileBlock(ifStmt.consequent, statementId, diagnostics))
        lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      }
      break
    }

    case "WhileStatement": {
      const whileStmt = node as BabelNode & {
        test: BabelNode
        body: BabelNode
      }
      const loopStart = generateLabel("while_start")
      const loopEnd = generateLabel("while_end")

      // LABEL loop_start
      lines.push(createInstruction(statementId, "LABEL", [loopStart]))
      // Compile condition
      lines.push(...compileExpression(whileStmt.test, statementId, diagnostics))
      // JUMP_IF_FALSE loop_end
      lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [loopEnd]))
      // Compile body
      lines.push(...compileBlock(whileStmt.body, statementId, diagnostics))
      // JUMP loop_start
      lines.push(createInstruction(statementId, "JUMP", [loopStart]))
      // LABEL loop_end
      lines.push(createInstruction(statementId, "LABEL", [loopEnd]))
      break
    }

    case "ForInStatement": {
      const forInStmt = node as BabelNode & {
        left: BabelNode
        right: BabelNode
        body: BabelNode
      }
      const loopStart = generateLabel("forin_start")
      const loopEnd = generateLabel("forin_end")

      // Get the variable name from left (could be VariableDeclaration or Identifier)
      let varName: string | undefined
      if (forInStmt.left.type === "VariableDeclaration") {
        const decl = forInStmt.left as BabelNode & {
          declarations: Array<{ id: { type: string; name?: string } }>
        }
        const name = decl.declarations[0]?.id.name
        if (decl.declarations[0]?.id.type === "Identifier" && name) {
          varName = name
          lines.push(createInstruction(statementId, "DECLARE_VAR", [name]))
        }
      } else if (forInStmt.left.type === "Identifier") {
        const id = forInStmt.left as BabelNode & { name: string }
        varName = id.name
      }

      if (!varName) {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexForInPattern"]))
        diagnostics.push({ statementId, message: "Complex for-in patterns not supported" })
        break
      }

      // Compile the object expression
      lines.push(...compileExpression(forInStmt.right, statementId, diagnostics))
      // GET_KEYS - get iterator for object keys
      lines.push(createInstruction(statementId, "GET_KEYS"))
      // LABEL loop_start
      lines.push(createInstruction(statementId, "LABEL", [loopStart]))
      // ITER_HAS_NEXT - check if more keys
      lines.push(createInstruction(statementId, "ITER_HAS_NEXT"))
      // JUMP_IF_FALSE loop_end
      lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [loopEnd]))
      // ITER_NEXT varName - get next key and store in variable
      lines.push(createInstruction(statementId, "ITER_NEXT", [varName as string]))
      // Compile body
      lines.push(...compileBlock(forInStmt.body, statementId, diagnostics))
      // JUMP loop_start
      lines.push(createInstruction(statementId, "JUMP", [loopStart]))
      // LABEL loop_end
      lines.push(createInstruction(statementId, "LABEL", [loopEnd]))
      break
    }

    case "ForStatement": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: "For loops not yet supported" })
      break
    }

    case "ForOfStatement": {
      const forOfStmt = node as BabelNode & {
        left: BabelNode
        right: BabelNode
        body: BabelNode
      }
      const loopStart = generateLabel("forof_start")
      const loopEnd = generateLabel("forof_end")

      // Get the variable name from left (could be VariableDeclaration or Identifier)
      let varName: string | undefined
      if (forOfStmt.left.type === "VariableDeclaration") {
        const decl = forOfStmt.left as BabelNode & {
          declarations: Array<{ id: { type: string; name?: string } }>
        }
        const name = decl.declarations[0]?.id.name
        if (decl.declarations[0]?.id.type === "Identifier" && name) {
          varName = name
          lines.push(createInstruction(statementId, "DECLARE_VAR", [name]))
        }
      } else if (forOfStmt.left.type === "Identifier") {
        const id = forOfStmt.left as BabelNode & { name: string }
        varName = id.name
      }

      if (!varName) {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexForOfPattern"]))
        diagnostics.push({ statementId, message: "Complex for-of patterns not supported" })
        break
      }

      // Compile the iterable expression
      lines.push(...compileExpression(forOfStmt.right, statementId, diagnostics))
      // GET_ITERATOR - get iterator for the iterable
      lines.push(createInstruction(statementId, "GET_ITERATOR"))
      // LABEL loop_start
      lines.push(createInstruction(statementId, "LABEL", [loopStart]))
      // ITER_HAS_NEXT - check if more values
      lines.push(createInstruction(statementId, "ITER_HAS_NEXT"))
      // JUMP_IF_FALSE loop_end
      lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [loopEnd]))
      // ITER_NEXT varName - get next value and store in variable
      lines.push(createInstruction(statementId, "ITER_NEXT", [varName as string]))
      // Compile body
      lines.push(...compileBlock(forOfStmt.body, statementId, diagnostics))
      // JUMP loop_start
      lines.push(createInstruction(statementId, "JUMP", [loopStart]))
      // LABEL loop_end
      lines.push(createInstruction(statementId, "LABEL", [loopEnd]))
      break
    }

    case "SwitchStatement": {
      const switchStmt = node as BabelNode & {
        discriminant: BabelNode
        cases: Array<{
          test: BabelNode | null
          consequent: BabelNode[]
        }>
      }

      const endLabel = generateLabel("switch_end")

      // Push end label to break target stack
      breakTargetStack.push(endLabel)

      // Evaluate discriminant
      lines.push(...compileExpression(switchStmt.discriminant, statementId, diagnostics))

      // Find default case index (if any)
      const defaultIndex = switchStmt.cases.findIndex(
        (c: { test: BabelNode | null }) => c.test === null
      )

      // Generate labels for each case
      const caseLabels = switchStmt.cases.map((c: { test: BabelNode | null }) =>
        c.test === null ? generateLabel("switch_default") : generateLabel("switch_case")
      )

      // Generate jump table: test each case and jump if match
      for (let i = 0; i < switchStmt.cases.length; i++) {
        const caseClause = switchStmt.cases[i]
        if (caseClause.test !== null) {
          // Duplicate discriminant for comparison
          lines.push(createInstruction(statementId, "DUP"))
          // Compile case test value
          lines.push(...compileExpression(caseClause.test, statementId, diagnostics))
          // Compare
          lines.push(createInstruction(statementId, "EQ"))
          // Jump to case body if match
          lines.push(createInstruction(statementId, "JUMP_IF_TRUE", [caseLabels[i]]))
        }
      }

      // No case matched - jump to default or end
      if (defaultIndex !== -1) {
        lines.push(createInstruction(statementId, "JUMP", [caseLabels[defaultIndex]]))
      } else {
        lines.push(createInstruction(statementId, "JUMP", [endLabel]))
      }

      // Emit case bodies with labels (in order for fall-through)
      for (let i = 0; i < switchStmt.cases.length; i++) {
        lines.push(createInstruction(statementId, "LABEL", [caseLabels[i]]))
        for (const stmt of switchStmt.cases[i].consequent) {
          lines.push(...compileStatement(stmt, statementId, diagnostics))
        }
        // Fall-through: no automatic jump - break statement handles jumping to end
      }

      // End label
      lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      // Pop discriminant from stack
      lines.push(createInstruction(statementId, "POP"))

      // Pop break target
      breakTargetStack.pop()
      break
    }

    case "BreakStatement": {
      if (breakTargetStack.length === 0) {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["BreakOutsideSwitch"]))
        diagnostics.push({ statementId, message: "Break statement outside of switch" })
      } else {
        const target = breakTargetStack[breakTargetStack.length - 1]
        lines.push(createInstruction(statementId, "JUMP", [target]))
      }
      break
    }

    case "ReturnStatement": {
      const returnStmt = node as BabelNode & { argument: BabelNode | null }
      if (returnStmt.argument) {
        lines.push(...compileExpression(returnStmt.argument, statementId, diagnostics))
        lines.push(createInstruction(statementId, "RETURN"))
      } else {
        lines.push(createInstruction(statementId, "RETURN_UNDEFINED"))
      }
      break
    }

    case "ImportDeclaration": {
      const importDecl = node as BabelNode & {
        specifiers: Array<{
          type: string
          local: { name: string }
          imported?: { name: string }
        }>
        source: { value: string }
      }
      const sourcePath = importDecl.source.value

      for (const spec of importDecl.specifiers) {
        if (spec.type === "ImportSpecifier") {
          const imported = spec as { imported: { name: string }; local: { name: string } }
          if (imported.imported.name !== imported.local.name) {
            lines.push(
              createInstruction(statementId, "IMPORT_AS", [
                imported.imported.name,
                imported.local.name,
                sourcePath,
              ])
            )
          } else {
            lines.push(createInstruction(statementId, "IMPORT", [imported.local.name, sourcePath]))
          }
        } else if (spec.type === "ImportDefaultSpecifier") {
          lines.push(createInstruction(statementId, "IMPORT_DEFAULT", [spec.local.name, sourcePath]))
        } else if (spec.type === "ImportNamespaceSpecifier") {
          lines.push(createInstruction(statementId, "IMPORT_NAMESPACE", [spec.local.name, sourcePath]))
        }
      }
      break
    }

    case "ExportNamedDeclaration": {
      const exportDecl = node as BabelNode & {
        declaration: BabelNode | null
        specifiers: Array<{
          local: { name: string }
          exported: { name: string }
        }>
      }

      if (exportDecl.declaration) {
        lines.push(...compileStatement(exportDecl.declaration, statementId, diagnostics))
        const names = extractDeclaredNames(exportDecl.declaration)
        for (const name of names) {
          lines.push(createInstruction(statementId, "EXPORT", [name]))
        }
      } else {
        for (const spec of exportDecl.specifiers) {
          if (spec.local.name !== spec.exported.name) {
            lines.push(
              createInstruction(statementId, "EXPORT_AS", [spec.local.name, spec.exported.name])
            )
          } else {
            lines.push(createInstruction(statementId, "EXPORT", [spec.local.name]))
          }
        }
      }
      break
    }

    case "ExportDefaultDeclaration": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: "Default exports not yet supported" })
      break
    }

    case "EmptyStatement": {
      lines.push(createInstruction(statementId, "NOOP"))
      break
    }

    case "BlockStatement": {
      lines.push(...compileBlock(node, statementId, diagnostics))
      break
    }

    default: {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: `Unsupported statement type: ${node.type}` })
    }
  }

  return lines
}

function compileBlock(node: BabelNode, statementId: string, diagnostics: CompileDiagnostic[]): InstructionLine[] {
  const lines: InstructionLine[] = []

  if (node.type === "BlockStatement") {
    const block = node as BabelNode & { body: BabelNode[] }
    for (const stmt of block.body) {
      lines.push(...compileStatement(stmt, statementId, diagnostics))
    }
  } else {
    // Single statement (no braces)
    lines.push(...compileStatement(node, statementId, diagnostics))
  }

  return lines
}

function extractDeclaredNames(node: BabelNode): string[] {
  if (node.type === "VariableDeclaration") {
    const decl = node as BabelNode & { declarations: Array<{ id: { name?: string } }> }
    return decl.declarations.map((d: { id: { name?: string } }) => d.id.name).filter(Boolean) as string[]
  }
  if (node.type === "FunctionDeclaration") {
    const func = node as BabelNode & { id: { name: string } | null }
    return func.id?.name ? [func.id.name] : []
  }
  return []
}

function compileExpression(node: BabelNode, statementId: string, diagnostics: CompileDiagnostic[]): InstructionLine[] {
  const lines: InstructionLine[] = []

  switch (node.type) {
    case "NumericLiteral": {
      const lit = node as BabelNode & { value: number }
      lines.push(createInstruction(statementId, "PUSH_CONST", [String(lit.value)]))
      break
    }

    case "StringLiteral": {
      const lit = node as BabelNode & { value: string }
      lines.push(createInstruction(statementId, "PUSH_CONST", [`"${lit.value}"`]))
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
      let hasSpread = false

      // Compile each element onto the stack
      for (const elem of arr.elements) {
        if (elem === null) {
          // Sparse array element (e.g., [1, , 3])
          lines.push(createInstruction(statementId, "PUSH_UNDEFINED"))
        } else if (elem.type === "SpreadElement") {
          // Spread element: [...arr]
          hasSpread = true
          const spread = elem as BabelNode & { argument: BabelNode }
          lines.push(...compileExpression(spread.argument, statementId, diagnostics))
          lines.push(createInstruction(statementId, "SPREAD"))
        } else {
          lines.push(...compileExpression(elem, statementId, diagnostics))
        }
      }

      // Create the array from the elements on the stack
      // Note: When spread is used, the actual element count may differ at runtime
      if (hasSpread) {
        lines.push(createInstruction(statementId, "CREATE_ARRAY", ["spread"]))
      } else {
        lines.push(createInstruction(statementId, "CREATE_ARRAY", [String(arr.elements.length)]))
      }
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

    case "BinaryExpression": {
      const bin = node as BabelNode & {
        left: BabelNode
        right: BabelNode
        operator: string
      }
      lines.push(...compileExpression(bin.left, statementId, diagnostics))
      lines.push(...compileExpression(bin.right, statementId, diagnostics))

      const opMap: Record<string, string> = {
        "+": "ADD",
        "-": "SUB",
        "*": "MUL",
        "/": "DIV",
        "%": "MOD",
        "==": "EQ",
        "===": "EQ",
        "!=": "NEQ",
        "!==": "NEQ",
        "<": "LT",
        ">": "GT",
        "<=": "LTE",
        ">=": "GTE",
      }

      const op = opMap[bin.operator]
      if (op) {
        lines.push(createInstruction(statementId, op))
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", [`BinaryOp(${bin.operator})`]))
        diagnostics.push({ statementId, message: `Unsupported binary operator: ${bin.operator}` })
      }
      break
    }

    case "AssignmentExpression": {
      const assign = node as BabelNode & {
        left: BabelNode & { name?: string }
        right: BabelNode
        operator: string
      }
      if (assign.left.type === "Identifier" && assign.left.name && assign.operator === "=") {
        lines.push(...compileExpression(assign.right, statementId, diagnostics))
        lines.push(createInstruction(statementId, "STORE_VAR", [assign.left.name]))
        lines.push(createInstruction(statementId, "LOAD_VAR", [assign.left.name]))
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexAssignment"]))
        diagnostics.push({ statementId, message: "Complex assignment patterns not supported" })
      }
      break
    }

    case "CallExpression": {
      const call = node as BabelNode & {
        callee: BabelNode & { name?: string; object?: BabelNode; property?: BabelNode & { name?: string } }
        arguments: BabelNode[]
      }
      // Compile arguments first (left to right)
      for (const arg of call.arguments) {
        lines.push(...compileExpression(arg, statementId, diagnostics))
      }

      if (call.callee.type === "Identifier" && call.callee.name) {
        // Simple function call: foo()
        lines.push(createInstruction(statementId, "CALL", [call.callee.name, String(call.arguments.length)]))
      } else if (call.callee.type === "MemberExpression" && call.callee.object && call.callee.property) {
        const memberExpr = call.callee as BabelNode & {
          object: BabelNode & { name?: string }
          property: BabelNode & { name?: string }
          computed: boolean
        }

        if (!memberExpr.computed && memberExpr.property.type === "Identifier" && memberExpr.property.name) {
          // Get the object name for narration
          let objectName = "object"
          if (memberExpr.object.type === "Identifier" && memberExpr.object.name) {
            objectName = memberExpr.object.name
          }

          // Compile the object expression onto stack
          lines.push(...compileExpression(memberExpr.object, statementId, diagnostics))

          // Call the method
          lines.push(
            createInstruction(statementId, "CALL_METHOD", [
              objectName,
              memberExpr.property.name,
              String(call.arguments.length),
            ]),
          )
        } else {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComputedMemberCall"]))
          diagnostics.push({ statementId, message: "Computed member call expressions not supported" })
        }
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexCallExpression"]))
        diagnostics.push({ statementId, message: "Complex call expressions not supported" })
      }
      break
    }

    case "MemberExpression": {
      const member = node as BabelNode & {
        object: BabelNode
        property: BabelNode & { name?: string }
        computed: boolean
      }
      lines.push(...compileExpression(member.object, statementId, diagnostics))
      if (!member.computed && member.property.type === "Identifier" && member.property.name) {
        // Static property access: obj.prop
        lines.push(createInstruction(statementId, "GET_PROP", [member.property.name]))
      } else if (member.computed) {
        // Computed property access: obj[expr]
        lines.push(...compileExpression(member.property, statementId, diagnostics))
        lines.push(createInstruction(statementId, "GET_COMPUTED_PROP"))
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexPropertyAccess"]))
        diagnostics.push({ statementId, message: "Complex property access not supported" })
      }
      break
    }

    case "UpdateExpression": {
      const update = node as BabelNode & {
        argument: BabelNode & { name?: string }
        operator: string
        prefix: boolean
      }
      if (update.argument.type === "Identifier" && update.argument.name) {
        const varName = update.argument.name
        if (update.operator === "++") {
          if (update.prefix) {
            // ++i: increment first, then push value
            lines.push(createInstruction(statementId, "INCREMENT", [varName]))
            lines.push(createInstruction(statementId, "LOAD_VAR", [varName]))
          } else {
            // i++: push old value, then increment
            lines.push(createInstruction(statementId, "LOAD_VAR", [varName]))
            lines.push(createInstruction(statementId, "INCREMENT", [varName]))
          }
        } else if (update.operator === "--") {
          if (update.prefix) {
            // --i: decrement first, then push value
            lines.push(createInstruction(statementId, "DECREMENT", [varName]))
            lines.push(createInstruction(statementId, "LOAD_VAR", [varName]))
          } else {
            // i--: push old value, then decrement
            lines.push(createInstruction(statementId, "LOAD_VAR", [varName]))
            lines.push(createInstruction(statementId, "DECREMENT", [varName]))
          }
        } else {
          lines.push(createInstruction(statementId, "UNSUPPORTED", [`UpdateOp(${update.operator})`]))
          diagnostics.push({ statementId, message: `Unknown update operator: ${update.operator}` })
        }
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComplexUpdateExpression"]))
        diagnostics.push({ statementId, message: "Complex update expressions not supported" })
      }
      break
    }

    case "UnaryExpression": {
      const unary = node as BabelNode & {
        argument: BabelNode
        operator: string
      }
      lines.push(...compileExpression(unary.argument, statementId, diagnostics))
      lines.push(createInstruction(statementId, "UNSUPPORTED", [`UnaryOp(${unary.operator})`]))
      diagnostics.push({ statementId, message: `Unary operator ${unary.operator} not yet supported` })
      break
    }

    case "ParenthesizedExpression": {
      const paren = node as BabelNode & { expression: BabelNode }
      lines.push(...compileExpression(paren.expression, statementId, diagnostics))
      break
    }

    case "TSAsExpression": {
      // TypeScript 'as' type assertion has no runtime effect - just compile the expression
      const asExpr = node as BabelNode & { expression: BabelNode }
      lines.push(...compileExpression(asExpr.expression, statementId, diagnostics))
      break
    }

    case "LogicalExpression": {
      const logical = node as BabelNode & {
        left: BabelNode
        right: BabelNode
        operator: string
      }
      const endLabel = generateLabel("logical_end")

      // Compile left operand
      lines.push(...compileExpression(logical.left, statementId, diagnostics))

      if (logical.operator === "&&") {
        // Short-circuit AND: if left is falsy, skip right
        lines.push(createInstruction(statementId, "DUP"))
        lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [endLabel]))
        lines.push(createInstruction(statementId, "POP")) // Remove duplicated left value
        lines.push(...compileExpression(logical.right, statementId, diagnostics))
        lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      } else if (logical.operator === "||") {
        // Short-circuit OR: if left is truthy, skip right
        lines.push(createInstruction(statementId, "DUP"))
        lines.push(createInstruction(statementId, "JUMP_IF_TRUE", [endLabel]))
        lines.push(createInstruction(statementId, "POP")) // Remove duplicated left value
        lines.push(...compileExpression(logical.right, statementId, diagnostics))
        lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      } else if (logical.operator === "??") {
        // Nullish coalescing: if left is null/undefined, evaluate right
        const notNullLabel = generateLabel("not_nullish")
        lines.push(createInstruction(statementId, "DUP"))
        // Check if value is null or undefined
        lines.push(createInstruction(statementId, "PUSH_NULL"))
        lines.push(createInstruction(statementId, "EQ"))
        lines.push(createInstruction(statementId, "JUMP_IF_FALSE", [notNullLabel]))
        // It was null, check for undefined
        lines.push(createInstruction(statementId, "POP")) // Remove duplicated left value
        lines.push(...compileExpression(logical.right, statementId, diagnostics))
        lines.push(createInstruction(statementId, "JUMP", [endLabel]))
        lines.push(createInstruction(statementId, "LABEL", [notNullLabel]))
        // Not null, keep the left value (already on stack from DUP, but we need to handle this properly)
        // Actually simpler: just keep the original left value on stack
        lines.push(createInstruction(statementId, "LABEL", [endLabel]))
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", [`LogicalOp(${logical.operator})`]))
        diagnostics.push({ statementId, message: `Unknown logical operator: ${logical.operator}` })
      }
      break
    }

    case "ObjectExpression": {
      const obj = node as BabelNode & {
        properties: Array<{
          type: string
          key: BabelNode & { name?: string; value?: string | number }
          value?: BabelNode
          shorthand?: boolean
          computed?: boolean
          method?: boolean
          argument?: BabelNode
        }>
      }

      // Compile each property value onto the stack, then create the object
      const propNames: string[] = []
      let hasSpread = false

      for (const prop of obj.properties) {
        if (prop.type === "SpreadElement") {
          hasSpread = true
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["SpreadInObject"]))
          diagnostics.push({ statementId, message: "Spread in object literals not supported" })
        } else if (prop.type === "ObjectProperty") {
          // Get the key name
          let keyName: string | null = null
          if (prop.key.type === "Identifier" && prop.key.name) {
            keyName = prop.key.name
          } else if (prop.key.type === "StringLiteral" && typeof prop.key.value === "string") {
            keyName = prop.key.value
          } else if (prop.computed) {
            lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComputedPropertyKey"]))
            diagnostics.push({ statementId, message: "Computed property keys not supported" })
            continue
          }

          if (keyName && prop.value) {
            propNames.push(keyName)
            lines.push(...compileExpression(prop.value, statementId, diagnostics))
          }
        } else if (prop.type === "ObjectMethod") {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["ObjectMethod"]))
          diagnostics.push({ statementId, message: "Object methods not supported" })
        }
      }

      if (!hasSpread) {
        // Create object with the property names and values on stack
        lines.push(createInstruction(statementId, "CREATE_OBJECT", [String(propNames.length)]))
        // Set each property (values are on stack in order, CREATE_OBJECT should handle this)
        // Actually, we need to associate names with values. Let's push property names as instructions.
        // Revising: push each property name after its value for SET_PROP
        // Let's just output SET_PROP instructions for each property
      }
      break
    }

    case "TemplateLiteral": {
      const template = node as BabelNode & {
        quasis: Array<{ value: { raw: string; cooked: string | null } }>
        expressions: BabelNode[]
      }

      // Template literals: `hello ${name}!` becomes "hello " + String(name) + "!"
      // We'll concatenate all parts

      for (let i = 0; i < template.quasis.length; i++) {
        const quasi = template.quasis[i]
        // Push the string part if non-empty
        if (quasi.value.cooked && quasi.value.cooked.length > 0) {
          lines.push(createInstruction(statementId, "PUSH_CONST", [`"${quasi.value.cooked}"`]))
        } else if (i === 0 || i === template.quasis.length - 1) {
          // Empty string at start or end - push empty string
          lines.push(createInstruction(statementId, "PUSH_CONST", ['""']))
        }

        // Push the expression if there is one (expressions.length = quasis.length - 1)
        if (i < template.expressions.length) {
          lines.push(...compileExpression(template.expressions[i], statementId, diagnostics))
          lines.push(createInstruction(statementId, "TO_STRING"))
        }
      }

      // Count total parts pushed
      const totalParts = template.quasis.filter(
        (q: { value: { cooked: string | null } }) => q.value.cooked && q.value.cooked.length > 0
      ).length +
        template.expressions.length +
        (template.quasis[0]?.value.cooked?.length === 0 ? 1 : 0)

      if (totalParts > 1) {
        lines.push(createInstruction(statementId, "CONCAT_STRINGS", [String(totalParts)]))
      } else if (totalParts === 0) {
        // Empty template literal
        lines.push(createInstruction(statementId, "PUSH_CONST", ['""']))
      }
      break
    }

    case "SpreadElement": {
      // SpreadElement in isolation (e.g., in function calls)
      const spread = node as BabelNode & { argument: BabelNode }
      lines.push(...compileExpression(spread.argument, statementId, diagnostics))
      lines.push(createInstruction(statementId, "SPREAD"))
      break
    }

    default: {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: `Unsupported expression type: ${node.type}` })
    }
  }

  return lines
}
