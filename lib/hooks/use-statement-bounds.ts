"use client"

import { useLayoutEffect, useState, type RefObject } from "react"
import type { StatementBlock } from "@/lib/bytecode/types"
import type { ColorBand } from "@/lib/constants"

export interface StatementBounds {
  statementId: string
  colorBand: ColorBand
  top: number
  bottom: number
  height: number
}

export type ColumnMeasurements = Map<string, StatementBounds>

/**
 * Hook to measure the bounding rectangles of statement blocks within a container.
 * Uses data-statement-id attributes to identify statement elements.
 */
export function useStatementBounds(
  containerRef: RefObject<HTMLElement | null>,
  statements: StatementBlock[]
): ColumnMeasurements {
  const [measurements, setMeasurements] = useState<ColumnMeasurements>(new Map())

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measureStatements = () => {
      const containerRect = container.getBoundingClientRect()
      const scrollTop = container.scrollTop
      const newMeasurements = new Map<string, StatementBounds>()

      // Query all elements with data-statement-id attribute
      const elements = container.querySelectorAll<HTMLElement>("[data-statement-id]")

      elements.forEach((element) => {
        const statementId = element.dataset.statementId
        const colorBand = parseInt(element.dataset.colorBand ?? "0", 10) as ColorBand
        if (!statementId) return

        const rect = element.getBoundingClientRect()
        // Calculate position relative to container's scroll position
        const top = rect.top - containerRect.top + scrollTop
        const bottom = rect.bottom - containerRect.top + scrollTop
        const height = rect.height

        newMeasurements.set(statementId, {
          statementId,
          colorBand,
          top,
          bottom,
          height,
        })
      })

      setMeasurements(newMeasurements)
    }

    // Initial measurement
    measureStatements()

    // Use ResizeObserver with debounce to prevent loops
    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        measureStatements()
        rafId = null
      })
    })

    observer.observe(container)

    // Also observe all statement elements for size changes
    const elements = container.querySelectorAll<HTMLElement>("[data-statement-id]")
    elements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [containerRef, statements])

  return measurements
}
