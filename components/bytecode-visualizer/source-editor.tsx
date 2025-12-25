"use client"

import type React from "react"

import { useCallback, useRef, useState, useEffect } from "react"
import type { StatementBlock, ParseError } from "@/lib/bytecode/types"
import { ZEBRA_COLORS, STATEMENT_HOVER_BORDER, STATEMENT_BORDER_BASE } from "@/lib/constants"

interface SourceEditorProps {
  source: string
  onChange: (source: string) => void
  statements: StatementBlock[]
  parseError: ParseError | null
  hoveredStatementId: string | null
  onHoverStatement: (id: string | null) => void
}

export function SourceEditor({ source, onChange, statements, parseError, hoveredStatementId, onHoverStatement }: SourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [lineHeights, setLineHeights] = useState<number[]>([])

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

  // Handle mouse move to detect which statement is being hovered
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget
      const rect = textarea.getBoundingClientRect()
      const y = e.clientY - rect.top + textarea.scrollTop
      const lineHeight = 24 // h-6 = 24px
      const lineNum = Math.floor(y / lineHeight) + 1

      const statement = statements.find((s) => lineNum >= s.loc.start.line && lineNum <= s.loc.end.line)
      onHoverStatement(statement?.id ?? null)
    },
    [statements, onHoverStatement],
  )

  const handleMouseLeave = useCallback(() => {
    onHoverStatement(null)
  }, [onHoverStatement])

  // Measure line heights to handle text wrapping
  const measureLineHeights = useCallback(() => {
    const measureEl = measureRef.current
    const textareaEl = textareaRef.current
    if (!measureEl || !textareaEl) return

    // Get the computed style of the textarea to match its rendering exactly
    const computedStyle = window.getComputedStyle(textareaEl)
    const width = textareaEl.clientWidth - 48 - 12 // Subtract padding (pl-12 = 48px, pr-3 = 12px)

    if (width <= 0) return // Container not yet sized

    // Copy all relevant text rendering properties
    measureEl.style.width = `${width}px`
    measureEl.style.font = computedStyle.font
    measureEl.style.fontSize = computedStyle.fontSize
    measureEl.style.fontFamily = computedStyle.fontFamily
    measureEl.style.fontWeight = computedStyle.fontWeight
    measureEl.style.letterSpacing = computedStyle.letterSpacing
    measureEl.style.wordSpacing = computedStyle.wordSpacing
    measureEl.style.lineHeight = computedStyle.lineHeight
    measureEl.style.whiteSpace = "pre-wrap"
    measureEl.style.wordBreak = "break-word"
    measureEl.style.overflowWrap = "break-word"
    measureEl.style.boxSizing = "border-box"
    measureEl.style.padding = "0"
    measureEl.style.margin = "0"
    measureEl.style.border = "none"

    const sourceLines = source.split("\n")
    const heights: number[] = []

    for (const line of sourceLines) {
      // Use a non-breaking space for empty lines to get proper height
      measureEl.textContent = line || "\u00A0"
      heights.push(measureEl.offsetHeight)
    }

    setLineHeights(heights)
  }, [source])

  // Re-measure when source changes
  useEffect(() => {
    measureLineHeights()
  }, [measureLineHeights])

  // Re-measure when container resizes
  useEffect(() => {
    const textareaEl = textareaRef.current
    if (!textareaEl) return

    const resizeObserver = new ResizeObserver(() => {
      measureLineHeights()
    })

    resizeObserver.observe(textareaEl)
    return () => resizeObserver.disconnect()
  }, [measureLineHeights])

  // Generate line backgrounds with zebra striping
  const lines = source.split("\n")

  // Group consecutive lines by statement for data attributes
  interface LineGroup {
    statementId: string | null
    colorBand: 0 | 1 | null
    lines: { lineNum: number; lineIndex: number }[]
  }

  const lineGroups: LineGroup[] = []
  let currentGroup: LineGroup | null = null

  lines.forEach((_, lineIndex) => {
    const lineNum = lineIndex + 1
    const statement = statements.find((s) => lineNum >= s.loc.start.line && lineNum <= s.loc.end.line)
    const statementId = statement?.id ?? null
    const colorBand = statement?.colorBand ?? null

    if (!currentGroup || currentGroup.statementId !== statementId) {
      currentGroup = { statementId, colorBand, lines: [] }
      lineGroups.push(currentGroup)
    }
    currentGroup.lines.push({ lineNum, lineIndex })
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
          {lineGroups.map((group, groupIndex) => {
            const isHovered = group.statementId != null && group.statementId === hoveredStatementId
            const bandKey = group.colorBand === 0 ? "band0" : "band1"
            const groupBgClass = group.statementId
              ? isHovered
                ? ZEBRA_COLORS[bandKey].hoverBg
                : ZEBRA_COLORS[bandKey].bg
              : "bg-transparent"
            const borderStyle = isHovered
              ? STATEMENT_HOVER_BORDER[bandKey].style
              : STATEMENT_HOVER_BORDER[bandKey].inactiveStyle

            return (
              <div
                key={groupIndex}
                data-statement-id={group.statementId ?? undefined}
                data-color-band={group.colorBand ?? undefined}
                className={`${groupBgClass} ${STATEMENT_BORDER_BASE}`}
                style={borderStyle}
              >
                {group.lines.map((line) => {
                  const height = lineHeights[line.lineIndex] || 24
                  return (
                    <div
                      key={line.lineNum}
                      className={`flex items-start ${errorLine === line.lineNum ? "!bg-red-100" : ""}`}
                      style={{ minHeight: "24px", height: `${height}px` }}
                    >
                      <span className="w-10 shrink-0 select-none pr-2 text-right text-muted-foreground leading-6">
                        {line.lineNum}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          value={source}
          onChange={handleChange}
          onScroll={handleScroll}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          spellCheck={false}
          className="absolute inset-0 h-full w-full resize-none bg-transparent font-mono text-sm leading-6 text-foreground outline-none"
          style={{
            caretColor: "currentColor",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            padding: "0 12px 0 48px",
          }}
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

        {/* Hidden element for measuring line heights */}
        <div
          ref={measureRef}
          className="invisible absolute left-0 top-0 font-mono text-sm"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
