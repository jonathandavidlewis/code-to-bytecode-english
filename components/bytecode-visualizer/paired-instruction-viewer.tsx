"use client"
import { forwardRef, useRef, useLayoutEffect } from "react"
import type { InstructionLine, StatementBlock } from "@/lib/bytecode/types"

interface PairedInstructionViewerProps {
  lines: InstructionLine[]
  statements: StatementBlock[]
}

interface InstructionGroup {
  statementId: string
  colorBand: 0 | 1
  lines: InstructionLine[]
}

function groupByStatement(lines: InstructionLine[], statements: StatementBlock[]): InstructionGroup[] {
  const statementMap = new Map(statements.map((s) => [s.id, s]))
  const groups: InstructionGroup[] = []
  let currentGroup: InstructionGroup | null = null

  for (const line of lines) {
    const statement = statementMap.get(line.statementId)
    const colorBand = statement?.colorBand ?? 0

    if (!currentGroup || currentGroup.statementId !== line.statementId) {
      currentGroup = {
        statementId: line.statementId,
        colorBand,
        lines: [],
      }
      groups.push(currentGroup)
    }
    currentGroup.lines.push(line)
  }

  return groups
}

function PairedRow({
  rowKey,
  bytecodeContent,
  englishContent,
  colorBand,
  lineNum,
  op,
}: {
  rowKey: string
  bytecodeContent: string
  englishContent: string
  colorBand: 0 | 1
  lineNum: number
  op: string
}) {
  const bytecodeRef = useRef<HTMLDivElement>(null)
  const englishRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const syncHeights = () => {
      if (!bytecodeRef.current || !englishRef.current || !containerRef.current) return

      // Reset heights to auto to get natural size
      bytecodeRef.current.style.minHeight = "auto"
      englishRef.current.style.minHeight = "auto"

      const bytecodeHeight = bytecodeRef.current.offsetHeight
      const englishHeight = englishRef.current.offsetHeight
      const maxHeight = Math.max(bytecodeHeight, englishHeight, 24)

      // Apply synchronized height
      bytecodeRef.current.style.minHeight = `${maxHeight}px`
      englishRef.current.style.minHeight = `${maxHeight}px`
    }

    syncHeights()

    // Use ResizeObserver but with a debounce flag to prevent loops
    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        syncHeights()
        rafId = null
      })
    })

    if (bytecodeRef.current) observer.observe(bytecodeRef.current)
    if (englishRef.current) observer.observe(englishRef.current)

    return () => {
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [bytecodeContent, englishContent])

  const bgClass = colorBand === 0 ? "bg-sky-50" : "bg-amber-50"
  const textClass =
    op === "UNSUPPORTED" ? "text-orange-600" : op === "NOOP" ? "text-slate-400 italic" : "text-foreground"

  return (
    <div ref={containerRef} className="flex" data-row={rowKey}>
      {/* Bytecode cell */}
      <div ref={bytecodeRef} className={`flex flex-1 border-r border-border px-3 py-1 font-mono text-sm ${bgClass}`}>
        <span className="w-6 flex-shrink-0 text-slate-500">{String(lineNum).padStart(2, "0")}</span>
        <span className="mx-2 text-slate-300">|</span>
        <span
          className={`flex-1 break-words ${op === "UNSUPPORTED" ? "text-orange-600" : op === "NOOP" ? "text-slate-400" : "text-foreground"}`}
        >
          {bytecodeContent}
        </span>
      </div>
      {/* English cell */}
      <div ref={englishRef} className={`flex-1 break-words px-3 py-1 text-sm ${bgClass} ${textClass}`}>
        {englishContent}
      </div>
    </div>
  )
}

export const PairedInstructionViewer = forwardRef<HTMLDivElement, PairedInstructionViewerProps>(
  function PairedInstructionViewer({ lines, statements }, ref) {
    const groups = groupByStatement(lines, statements)

    let lineNumber = 0

    return (
      <div ref={ref} className="flex h-full flex-col overflow-auto">
        {/* Headers */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-muted">
          <div className="flex-1 border-r border-border px-3 py-2">
            <h2 className="text-sm font-semibold text-foreground">Bytecode</h2>
            <p className="text-xs text-muted-foreground">Stack-based instructions</p>
          </div>
          <div className="flex-1 px-3 py-2">
            <h2 className="text-sm font-semibold text-foreground">English</h2>
            <p className="text-xs text-muted-foreground">Human-readable narration</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {groups.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No instructions to display
            </div>
          ) : (
            groups.map((group) =>
              group.lines.map((line, index) => {
                const key = `${group.statementId}-${index}`
                const currentLineNum = lineNumber++

                return (
                  <PairedRow
                    key={key}
                    rowKey={key}
                    bytecodeContent={line.text}
                    englishContent={line.english}
                    colorBand={group.colorBand}
                    lineNum={currentLineNum}
                    op={line.op}
                  />
                )
              }),
            )
          )}
        </div>
      </div>
    )
  },
)
