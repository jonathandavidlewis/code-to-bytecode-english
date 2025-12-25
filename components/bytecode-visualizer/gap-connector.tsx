"use client"

import { useEffect, useState, useRef, type RefObject } from "react"
import type { StatementBlock } from "@/lib/bytecode/types"
import { GAP_BETWEEN_COLUMNS, ZEBRA_COLORS, STATEMENT_HOVER_BORDER } from "@/lib/constants"

interface GapConnectorProps {
  leftColumnRef: RefObject<HTMLElement | null>
  rightColumnRef: RefObject<HTMLElement | null>
  statements: StatementBlock[]
  scrollContainerRef: RefObject<HTMLElement | null>
  /** Optional counter to trigger re-measurement when line heights change */
  lineHeightUpdateCount?: number
  hoveredStatementId: string | null
}

interface TrapezoidData {
  statementId: string
  colorBand: 0 | 1
  leftTop: number
  leftBottom: number
  rightTop: number
  rightBottom: number
}

/**
 * Renders SVG trapezoids connecting zebra bands between adjacent columns.
 * When statement heights differ between columns, the bands have diagonal edges.
 */
export function GapConnector({
  leftColumnRef,
  rightColumnRef,
  statements,
  scrollContainerRef,
  lineHeightUpdateCount,
  hoveredStatementId,
}: GapConnectorProps) {
  const [trapezoids, setTrapezoids] = useState<TrapezoidData[]>([])
  const [height, setHeight] = useState(0)
  const [measureCount, setMeasureCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Force re-measurement after mount and when statements change
  useEffect(() => {
    // Small delay to ensure refs are populated and layout is complete
    const timeoutId = setTimeout(() => {
      setMeasureCount((c) => c + 1)
    }, 50)
    return () => clearTimeout(timeoutId)
  }, [statements])

  useEffect(() => {
    const leftColumn = leftColumnRef.current
    const rightColumn = rightColumnRef.current
    const scrollContainer = scrollContainerRef.current
    const container = containerRef.current

    if (!leftColumn || !rightColumn || !scrollContainer || !container) {
      return
    }

    const measureTrapezoids = () => {
      const containerRect = container.getBoundingClientRect()
      const newTrapezoids: TrapezoidData[] = []

      // Get the content height based on container's parent
      const contentHeight = scrollContainer.scrollHeight
      setHeight(contentHeight)

      for (const statement of statements) {
        // Find elements with matching statement ID in each column
        const leftEl = leftColumn.querySelector<HTMLElement>(
          `[data-statement-id="${statement.id}"]`
        )
        const rightEl = rightColumn.querySelector<HTMLElement>(
          `[data-statement-id="${statement.id}"]`
        )

        if (!leftEl || !rightEl) continue

        const leftRect = leftEl.getBoundingClientRect()
        const rightRect = rightEl.getBoundingClientRect()

        // Calculate positions relative to the gap container's top
        // We need positions relative to the container's coordinate system
        const leftTop = leftRect.top - containerRect.top
        const leftBottom = leftRect.bottom - containerRect.top
        const rightTop = rightRect.top - containerRect.top
        const rightBottom = rightRect.bottom - containerRect.top

        newTrapezoids.push({
          statementId: statement.id,
          colorBand: statement.colorBand,
          leftTop,
          leftBottom,
          rightTop,
          rightBottom,
        })
      }

      setTrapezoids(newTrapezoids)
    }

    // Initial measurement
    measureTrapezoids()

    // Use ResizeObserver with debounce
    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        measureTrapezoids()
        rafId = null
      })
    })

    observer.observe(leftColumn)
    observer.observe(rightColumn)
    observer.observe(scrollContainer)

    // Also observe individual statement elements to catch expand/collapse changes
    const statementElements = [
      ...leftColumn.querySelectorAll<HTMLElement>("[data-statement-id]"),
      ...rightColumn.querySelectorAll<HTMLElement>("[data-statement-id]"),
    ]
    for (const el of statementElements) {
      observer.observe(el)
    }

    // Also observe scroll events
    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        measureTrapezoids()
        rafId = null
      })
    }
    scrollContainer.addEventListener("scroll", handleScroll)

    return () => {
      observer.disconnect()
      scrollContainer.removeEventListener("scroll", handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [leftColumnRef, rightColumnRef, scrollContainerRef, statements, measureCount, lineHeightUpdateCount])

  return (
    <div ref={containerRef} className="relative h-full" style={{ width: GAP_BETWEEN_COLUMNS }}>
      <svg
        className="absolute left-0 top-0 pointer-events-none"
        width={GAP_BETWEEN_COLUMNS}
        height={height || "100%"}
        preserveAspectRatio="none"
      >
        {trapezoids.map((trap) => {
          const isHovered = trap.statementId === hoveredStatementId
          const bandKey = trap.colorBand === 0 ? "band0" : "band1"
          const fill = ZEBRA_COLORS[bandKey].fill
          const stroke = isHovered ? STATEMENT_HOVER_BORDER[bandKey].stroke : "none"

          // Create trapezoid points:
          // - Top-left: (0, leftTop)
          // - Top-right: (GAP_WIDTH, rightTop)
          // - Bottom-right: (GAP_WIDTH, rightBottom)
          // - Bottom-left: (0, leftBottom)
          const points = [
            `0,${trap.leftTop}`,
            `${GAP_BETWEEN_COLUMNS},${trap.rightTop}`,
            `${GAP_BETWEEN_COLUMNS},${trap.rightBottom}`,
            `0,${trap.leftBottom}`,
          ].join(" ")

          return (
            <polygon
              key={trap.statementId}
              points={points}
              fill={fill}
              stroke={stroke}
              strokeWidth={isHovered ? 1 : 0}
            />
          )
        })}
      </svg>
    </div>
  )
}
