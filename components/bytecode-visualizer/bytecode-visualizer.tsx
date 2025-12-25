"use client"

import { useState, useCallback, useMemo } from "react"
import { parseSource, compile } from "@/lib/bytecode"
import type { ParseStatus, StatementBlock, ParseError } from "@/lib/bytecode/types"
import { SourceEditor } from "./source-editor"
import { AstViewer } from "./ast-viewer"
import { PairedInstructionViewer } from "./paired-instruction-viewer"

const DEFAULT_SOURCE = `// Try editing this code!
const num = 6;
const doubled = num * 2;
const sum = num + doubled;
console.log(sum);`

export function BytecodeVisualizer() {
  const [source, setSource] = useState(DEFAULT_SOURCE)
  const [parseStatus, setParseStatus] = useState<ParseStatus>(() => parseSource(DEFAULT_SOURCE))

  // Parse on source change
  const handleSourceChange = useCallback((newSource: string) => {
    setSource(newSource)
    const result = parseSource(newSource)

    setParseStatus((prev) => {
      if (result.kind === "valid") {
        return result
      }
      // Keep last valid state
      if (prev.kind === "valid") {
        return {
          kind: "invalid",
          error: result.error,
          lastValid: { ast: prev.ast, statements: prev.statements },
        }
      }
      return {
        kind: "invalid",
        error: result.error,
        lastValid: prev.lastValid,
      }
    })
  }, [])

  // Get current statements (from valid parse or last valid)
  const statements: StatementBlock[] = useMemo(() => {
    if (parseStatus.kind === "valid") {
      return parseStatus.statements
    }
    return parseStatus.lastValid?.statements ?? []
  }, [parseStatus])

  // Compile bytecode
  const compileResult = useMemo(() => {
    return compile(statements)
  }, [statements])

  // Get parse error if any
  const parseError: ParseError | null = parseStatus.kind === "invalid" ? parseStatus.error : null

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-muted/50 px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">JS/TS Bytecode Visualizer</h1>
        <p className="text-sm text-muted-foreground">
          See how your code transforms into AST, bytecode instructions, and English narration
        </p>
      </header>

      <div className="grid flex-1 grid-cols-[1fr_1fr_2fr] divide-x divide-border overflow-hidden">
        {/* Column 1: Source Editor */}
        <div className="overflow-hidden">
          <SourceEditor source={source} onChange={handleSourceChange} statements={statements} parseError={parseError} />
        </div>

        {/* Column 2: AST Viewer */}
        <div className="overflow-hidden">
          <AstViewer statements={statements} />
        </div>

        {/* Column 3: Paired Bytecode + English Viewer */}
        <div className="overflow-hidden">
          <PairedInstructionViewer lines={compileResult.lines} statements={statements} />
        </div>
      </div>
    </div>
  )
}
