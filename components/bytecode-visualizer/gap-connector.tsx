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

    // Track animation frame IDs separately for scroll vs resize
    let scrollRafId: number | null = null
    let resizeRafId: number | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    // Scroll handler - immediate response using only rAF (no debounce)
    // This ensures smooth 60fps updates during scroll
    const handleScroll = () => {
      if (scrollRafId) return // Already have a pending frame
      scrollRafId = requestAnimationFrame(() => {
        measureTrapezoids()
        scrollRafId = null
      })
    }

    // Resize handler - debounced since resize events are less frequent
    const handleResize = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      if (resizeRafId) {
        cancelAnimationFrame(resizeRafId)
        resizeRafId = null
      }

      debounceTimer = setTimeout(() => {
        resizeRafId = requestAnimationFrame(() => {
          measureTrapezoids()
          resizeRafId = null
        })
      }, 50)
    }

    const observer = new ResizeObserver(handleResize)

    // Only observe the three container elements (not individual statements)
    observer.observe(leftColumn)
    observer.observe(rightColumn)
    observer.observe(scrollContainer)

    // Find scrollable elements inside each column (they have overflow-auto)
    // The column refs point to wrapper divs; the actual scrollable content is inside
    const findScrollableChild = (el: HTMLElement): HTMLElement | null => {
      // Check if this element scrolls
      if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== "hidden") {
        return el
      }
      // Check children
      for (const child of el.children) {
        if (child instanceof HTMLElement) {
          const scrollable = findScrollableChild(child)
          if (scrollable) return scrollable
        }
      }
      return null
    }

    // Collect all scrollable elements to listen to
    const scrollableElements: HTMLElement[] = []
    const leftScrollable = findScrollableChild(leftColumn)
    const rightScrollable = findScrollableChild(rightColumn)
    if (leftScrollable) scrollableElements.push(leftScrollable)
    if (rightScrollable) scrollableElements.push(rightScrollable)
    // Also listen to the main scroll container if it scrolls
    if (scrollContainer.scrollHeight > scrollContainer.clientHeight) {
      scrollableElements.push(scrollContainer)
    }

    // Add scroll listeners to all scrollable elements
    for (const el of scrollableElements) {
      el.addEventListener("scroll", handleScroll, { passive: true })
    }

    return () => {
      observer.disconnect()
      for (const el of scrollableElements) {
        el.removeEventListener("scroll", handleScroll)
      }
      if (scrollRafId) cancelAnimationFrame(scrollRafId)
      if (resizeRafId) cancelAnimationFrame(resizeRafId)
      if (debounceTimer) clearTimeout(debounceTimer)
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
