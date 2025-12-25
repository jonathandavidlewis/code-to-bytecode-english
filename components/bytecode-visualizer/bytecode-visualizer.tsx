"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import { parseSource, compile } from "@/lib/bytecode"
import type { ParseStatus, StatementBlock, ParseError } from "@/lib/bytecode/types"
import { SourceEditor } from "./source-editor"
import { AstViewer } from "./ast-viewer"
import { BytecodeViewer } from "./bytecode-viewer"
import { EnglishViewer } from "./english-viewer"
import { GapConnector } from "./gap-connector"
import { GAP_BETWEEN_COLUMNS } from "@/lib/constants"
import { useLineHeightSync } from "@/hooks/use-line-height-sync"

const DEFAULT_SOURCE = `// Try editing this code!
const num = 6;
const doubled = num * 2;
const sum = num + doubled;
console.log(sum);`

export function BytecodeVisualizer() {
  const [source, setSource] = useState(DEFAULT_SOURCE)
  const [parseStatus, setParseStatus] = useState<ParseStatus>(() => parseSource(DEFAULT_SOURCE))
  const [hoveredStatementId, setHoveredStatementId] = useState<string | null>(null)

  // Refs for column content areas
  const sourceColumnRef = useRef<HTMLDivElement>(null)
  const astColumnRef = useRef<HTMLDivElement>(null)
  const bytecodeColumnRef = useRef<HTMLDivElement>(null)
  const englishColumnRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

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

  // Sync line heights between bytecode and English columns
  const lineHeightSync = useLineHeightSync(compileResult.lines.length)

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

      {/* Main content with 7-column grid: 4 content columns + 3 gap columns */}
      <div
        ref={scrollContainerRef}
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `1fr ${GAP_BETWEEN_COLUMNS}px 1fr ${GAP_BETWEEN_COLUMNS}px 1fr ${GAP_BETWEEN_COLUMNS}px 1fr`,
        }}
      >
        {/* Column 1: Source Editor */}
        <div ref={sourceColumnRef} className="overflow-hidden">
          <SourceEditor source={source} onChange={handleSourceChange} statements={statements} parseError={parseError} hoveredStatementId={hoveredStatementId} onHoverStatement={setHoveredStatementId} />
        </div>

        {/* Gap 1: Source to AST connector */}
        <GapConnector
          leftColumnRef={sourceColumnRef}
          rightColumnRef={astColumnRef}
          statements={statements}
          scrollContainerRef={scrollContainerRef}
          hoveredStatementId={hoveredStatementId}
        />

        {/* Column 2: AST Viewer */}
        <div ref={astColumnRef} className="overflow-hidden">
          <AstViewer statements={statements} hoveredStatementId={hoveredStatementId} onHoverStatement={setHoveredStatementId} />
        </div>

        {/* Gap 2: AST to Bytecode connector */}
        <GapConnector
          leftColumnRef={astColumnRef}
          rightColumnRef={bytecodeColumnRef}
          statements={statements}
          scrollContainerRef={scrollContainerRef}
          hoveredStatementId={hoveredStatementId}
        />

        {/* Column 3: Bytecode Viewer */}
        <div ref={bytecodeColumnRef} className="overflow-hidden">
          <BytecodeViewer lines={compileResult.lines} statements={statements} lineHeightSync={lineHeightSync} columnId="bytecode" hoveredStatementId={hoveredStatementId} onHoverStatement={setHoveredStatementId} />
        </div>

        {/* Gap 3: Bytecode to English connector */}
        <GapConnector
          leftColumnRef={bytecodeColumnRef}
          rightColumnRef={englishColumnRef}
          statements={statements}
          scrollContainerRef={scrollContainerRef}
          lineHeightUpdateCount={lineHeightSync.updateCount}
          hoveredStatementId={hoveredStatementId}
        />

        {/* Column 4: English Viewer */}
        <div ref={englishColumnRef} className="overflow-hidden">
          <EnglishViewer lines={compileResult.lines} statements={statements} lineHeightSync={lineHeightSync} columnId="english" hoveredStatementId={hoveredStatementId} onHoverStatement={setHoveredStatementId} />
        </div>
      </div>
    </div>
  )
}
