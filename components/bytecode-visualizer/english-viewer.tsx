"use client"

import type React from "react"

import { forwardRef } from "react"
import type { InstructionLine, StatementBlock } from "@/lib/bytecode/types"
import type { LineHeightSync } from "@/hooks/use-line-height-sync"

interface EnglishViewerProps {
  lines: InstructionLine[]
  statements: StatementBlock[]
  onScroll?: (scrollTop: number) => void
  lineHeightSync?: LineHeightSync
  columnId?: string
}

export const EnglishViewer = forwardRef<HTMLDivElement, EnglishViewerProps>(function EnglishViewer(
  { lines, statements, onScroll, lineHeightSync, columnId = "english" },
  ref,
) {
  // Group lines by statement
  const groups = groupByStatement(lines, statements)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(e.currentTarget.scrollTop)
  }

  // Track global line index across groups
  let globalLineIndex = 0

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">English</h2>
        <p className="text-xs text-muted-foreground">Human-readable narration</p>
      </div>
      <div ref={ref} onScroll={handleScroll} className="flex-1 overflow-auto text-sm leading-6">
        {groups.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No narration to display
          </div>
        ) : (
          groups.map((group) => {
            const groupStartIndex = globalLineIndex
            globalLineIndex += group.lines.length

            return (
              <div
                key={group.statementId}
                data-statement-id={group.statementId}
                data-color-band={group.colorBand}
                className={`${group.colorBand === 0 ? "bg-sky-50" : "bg-amber-50"}`}
              >
                {group.lines.map((line, index) => {
                  const lineIndex = groupStartIndex + index
                  const syncedHeight = lineHeightSync?.getLineHeight(lineIndex)

                  return (
                    <div
                      key={index}
                      ref={(el) => lineHeightSync?.setLineRef(columnId, lineIndex, el)}
                      className={`min-h-6 px-3 py-0.5 ${
                        line.op === "UNSUPPORTED"
                          ? "text-orange-600"
                          : line.op === "NOOP"
                            ? "italic text-slate-400"
                            : "text-foreground"
                      }`}
                      style={syncedHeight ? { minHeight: syncedHeight } : undefined}
                    >
                      {line.english}
                    </div>
                  )
                })}
              </div>
            )
          })
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
