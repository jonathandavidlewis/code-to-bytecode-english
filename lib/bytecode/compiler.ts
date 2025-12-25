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
  // Iterator operations for for-in loops
  GET_KEYS: () => "Get the enumerable keys of the object on the stack and push an iterator.",
  ITER_NEXT: (args) => `Get the next key from the iterator and store it in '${args[0]}'.`,
  ITER_HAS_NEXT: () => "Check if the iterator has more items; push true or false.",
  // Update operations
  INCREMENT: (args) => `Increment the value of '${args[0]}' by 1.`,
  DECREMENT: (args) => `Decrement the value of '${args[0]}' by 1.`,
  // Array operations
  CREATE_ARRAY: (args) => `Create a new array with ${args[0]} element(s).`,
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
      lines.push(createInstruction(statementId, "UNSUPPORTED", ["FunctionDeclaration"]))
      diagnostics.push({ statementId, message: "Function declarations not yet supported in MVP" })
      break
    }

    case "IfStatement": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", ["IfStatement"]))
      diagnostics.push({ statementId, message: "If statements not yet supported in MVP" })
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
      let varName: string | null = null
      if (forInStmt.left.type === "VariableDeclaration") {
        const decl = forInStmt.left as BabelNode & {
          declarations: Array<{ id: { type: string; name?: string } }>
        }
        if (decl.declarations[0]?.id.type === "Identifier" && decl.declarations[0]?.id.name) {
          varName = decl.declarations[0].id.name
          lines.push(createInstruction(statementId, "DECLARE_VAR", [varName]))
        }
      } else if (forInStmt.left.type === "Identifier") {
        const id = forInStmt.left as BabelNode & { name: string }
        varName = id.name
      }

      if (varName === null) {
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

    case "ForStatement":
    case "ForOfStatement": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: "This loop type is not yet supported" })
      break
    }

    case "ReturnStatement": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", ["ReturnStatement"]))
      diagnostics.push({ statementId, message: "Return statements not yet supported in MVP" })
      break
    }

    case "ImportDeclaration":
    case "ExportNamedDeclaration":
    case "ExportDefaultDeclaration": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: "Module syntax not supported in teaching VM" })
      break
    }

    case "EmptyStatement": {
      lines.push(createInstruction(statementId, "NOOP"))
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
      // Compile each element onto the stack
      for (const elem of arr.elements) {
        if (elem === null) {
          // Sparse array element (e.g., [1, , 3])
          lines.push(createInstruction(statementId, "PUSH_UNDEFINED"))
        } else if (elem.type === "SpreadElement") {
          lines.push(createInstruction(statementId, "UNSUPPORTED", ["SpreadElement"]))
          diagnostics.push({ statementId, message: "Spread elements in arrays not supported" })
        } else {
          lines.push(...compileExpression(elem, statementId, diagnostics))
        }
      }
      // Create the array from the elements on the stack
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
        lines.push(createInstruction(statementId, "GET_PROP", [member.property.name]))
      } else {
        lines.push(createInstruction(statementId, "UNSUPPORTED", ["ComputedPropertyAccess"]))
        diagnostics.push({ statementId, message: "Computed property access not supported" })
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

    default: {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: `Unsupported expression type: ${node.type}` })
    }
  }

  return lines
}
