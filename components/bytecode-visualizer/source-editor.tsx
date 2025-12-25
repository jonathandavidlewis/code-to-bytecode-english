"use client"

import type React from "react"

import { useCallback, useRef } from "react"
import type { StatementBlock, ParseError } from "@/lib/bytecode/types"

interface SourceEditorProps {
  source: string
  onChange: (source: string) => void
  statements: StatementBlock[]
  parseError: ParseError | null
}

export function SourceEditor({ source, onChange, statements, parseError }: SourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  // Generate line backgrounds with zebra striping
  const lines = source.split("\n")

  // Group consecutive lines by statement for data attributes
  interface LineGroup {
    statementId: string | null
    colorBand: 0 | 1 | null
    lines: { lineNum: number; bgClass: string }[]
  }

  const lineGroups: LineGroup[] = []
  let currentGroup: LineGroup | null = null

  lines.forEach((_, lineIndex) => {
    const lineNum = lineIndex + 1
    const statement = statements.find((s) => lineNum >= s.loc.start.line && lineNum <= s.loc.end.line)
    const statementId = statement?.id ?? null
    const colorBand = statement?.colorBand ?? null
    const bgClass = statement ? (statement.colorBand === 0 ? "bg-sky-50" : "bg-amber-50") : "bg-transparent"

    if (!currentGroup || currentGroup.statementId !== statementId) {
      currentGroup = { statementId, colorBand, lines: [] }
      lineGroups.push(currentGroup)
    }
    currentGroup.lines.push({ lineNum, bgClass })
  })

  // Check if there's an error on a specific line
  const errorLine = parseError?.loc?.line

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">Source Code</h2>
        <p className="text-xs text-muted-foreground">TypeScript / JavaScript</p>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {/* Line numbers and backgrounds */}
        <div
          ref={highlightRef}
          className="pointer-events-none absolute inset-0 overflow-hidden font-mono text-sm leading-6"
          aria-hidden="true"
        >
          {lineGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              data-statement-id={group.statementId ?? undefined}
              data-color-band={group.colorBand ?? undefined}
            >
              {group.lines.map((line) => (
                <div
                  key={line.lineNum}
                  className={`flex h-6 ${line.bgClass} ${errorLine === line.lineNum ? "!bg-red-100" : ""}`}
                >
                  <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground">
                    {line.lineNum}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={source}
          onChange={handleChange}
          onScroll={handleScroll}
          spellCheck={false}
          className="absolute inset-0 h-full w-full resize-none bg-transparent py-0 pl-12 pr-3 font-mono text-sm leading-6 text-foreground outline-none"
          style={{ caretColor: "currentColor" }}
        />

        {/* Error indicator */}
        {parseError && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-red-200 bg-red-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-red-500">⚠</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-red-700">Parse Error</p>
                <p className="truncate text-xs text-red-600">
                  {parseError.loc && `Line ${parseError.loc.line}: `}
                  {parseError.message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
