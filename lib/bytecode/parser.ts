import { parse } from "@babel/parser"
import type { Node as BabelNode } from "@babel/types"
import type { ParseStatus, StatementBlock, BabelProgram, SourceLoc } from "./types"

export function parseSource(source: string): ParseStatus {
  try {
    const file = parse(source, {
      sourceType: "module",
      plugins: ["typescript"],
      errorRecovery: false,
    })

    const ast = file.program as unknown as BabelProgram

    if (!ast || !ast.body) {
      return {
        kind: "invalid",
        error: {
          message: "Failed to parse AST body",
        },
      }
    }

    const statements = extractStatementBlocks(ast)

    return {
      kind: "valid",
      ast,
      statements,
    }
  } catch (err: unknown) {
    const error = err as { message?: string; loc?: { line: number; column: number } }
    return {
      kind: "invalid",
      error: {
        message: error.message || "Parse error",
        loc: error.loc,
      },
    }
  }
}

function extractStatementBlocks(ast: BabelProgram): StatementBlock[] {
  const blocks: StatementBlock[] = []

  const body = ast?.body ?? []

  body.forEach((node, index) => {
    const loc = extractLoc(node)
    if (loc) {
      blocks.push({
        id: `stmt-${index}-${loc.start.line}-${loc.start.column}`,
        index,
        loc,
        node,
        colorBand: (index % 2) as 0 | 1,
      })
    }
  })

  return blocks
}

function extractLoc(node: BabelNode): SourceLoc | null {
  if (!node.loc) return null

  return {
    start: {
      line: node.loc.start.line,
      column: node.loc.start.column,
      index: node.start ?? undefined,
    },
    end: {
      line: node.loc.end.line,
      column: node.loc.end.column,
      index: node.end ?? undefined,
    },
  }
}
