"use client"

import type React from "react"

import { forwardRef } from "react"
import type { InstructionLine, StatementBlock } from "@/lib/bytecode/types"

interface BytecodeViewerProps {
  lines: InstructionLine[]
  statements: StatementBlock[]
  onScroll?: (scrollTop: number) => void
}

export const BytecodeViewer = forwardRef<HTMLDivElement, BytecodeViewerProps>(function BytecodeViewer(
  { lines, statements, onScroll },
  ref,
) {
  // Group lines by statement
  const groups = groupByStatement(lines, statements)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(e.currentTarget.scrollTop)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">Bytecode</h2>
        <p className="text-xs text-muted-foreground">Stack-based instructions</p>
      </div>
      <div ref={ref} onScroll={handleScroll} className="flex-1 overflow-auto font-mono text-sm leading-6">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No instructions to display
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.statementId} className={`${group.colorBand === 0 ? "bg-sky-50" : "bg-amber-50"}`}>
              {group.lines.map((line, index) => (
                <div key={index} className="h-6 px-3">
                  <span className="text-slate-500">{String(index).padStart(2, "0")}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span
                    className={
                      line.op === "UNSUPPORTED"
                        ? "text-orange-600"
                        : line.op === "NOOP"
                          ? "text-slate-400"
                          : "text-foreground"
                    }
                  >
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
})

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
