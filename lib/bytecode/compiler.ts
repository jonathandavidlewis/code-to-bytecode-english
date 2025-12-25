import type { Node as BabelNode } from "@babel/types"
import type { StatementBlock, InstructionLine, CompileResult, CompileDiagnostic } from "./types"

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

    case "WhileStatement":
    case "ForStatement":
    case "ForOfStatement":
    case "ForInStatement": {
      lines.push(createInstruction(statementId, "UNSUPPORTED", [node.type]))
      diagnostics.push({ statementId, message: "Loop statements not yet supported in MVP" })
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
