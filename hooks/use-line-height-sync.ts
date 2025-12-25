import { useCallback, useEffect, useRef, useState } from "react"

export interface LineHeightSync {
  /** Ref callback to attach to line elements - call with (columnId, lineIndex, element) */
  setLineRef: (columnId: string, lineIndex: number, element: HTMLElement | null) => void
  /** Get the synchronized height for a line (returns undefined if not yet measured) */
  getLineHeight: (lineIndex: number) => number | undefined
  /** Array of synchronized heights indexed by line number */
  lineHeights: (number | undefined)[]
  /** Counter that increments each time heights are updated - use as dependency for re-measuring */
  updateCount: number
}

/**
 * Hook to synchronize line heights across multiple columns.
 * Measures the natural height of each line in all columns and returns the max.
 */
export function useLineHeightSync(lineCount: number): LineHeightSync {
  // Store refs to all line elements: Map<columnId, Map<lineIndex, element>>
  const lineRefs = useRef<Map<string, Map<number, HTMLElement>>>(new Map())

  // Computed max heights for each line
  const [lineHeights, setLineHeights] = useState<(number | undefined)[]>([])

  // Counter that increments when heights change - for external components to react
  const [updateCount, setUpdateCount] = useState(0)

  // Track if we're currently measuring to avoid infinite loops
  const isMeasuringRef = useRef(false)

  // Debounce timer for recalculation
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ResizeObserver ref
  const observerRef = useRef<ResizeObserver | null>(null)

  // Recalculate all heights
  const recalculateHeights = useCallback(() => {
    if (isMeasuringRef.current) return

    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      isMeasuringRef.current = true

      const maxHeights: (number | undefined)[] = []

      for (let i = 0; i < lineCount; i++) {
        let maxHeight = 0

        for (const columnRefs of lineRefs.current.values()) {
          const element = columnRefs.get(i)
          if (element) {
            // Get the natural height by temporarily removing any forced height
            const previousMinHeight = element.style.minHeight
            element.style.minHeight = ""

            // Force layout recalculation
            const naturalHeight = element.scrollHeight
            element.style.minHeight = previousMinHeight

            maxHeight = Math.max(maxHeight, naturalHeight)
          }
        }

        maxHeights[i] = maxHeight > 0 ? maxHeight : undefined
      }

      // Only update if heights actually changed
      setLineHeights((prev) => {
        const hasChanges = maxHeights.some((h, i) => h !== prev[i]) || maxHeights.length !== prev.length
        if (!hasChanges) {
          isMeasuringRef.current = false
          return prev
        }
        // Increment update count so external components know to re-measure
        setUpdateCount((c) => c + 1)
        // Use requestAnimationFrame to batch the update
        requestAnimationFrame(() => {
          isMeasuringRef.current = false
        })
        return maxHeights
      })
    }, 16) // ~1 frame debounce
  }, [lineCount])

  // Initialize ResizeObserver
  useEffect(() => {
    observerRef.current = new ResizeObserver(() => {
      recalculateHeights()
    })

    return () => {
      observerRef.current?.disconnect()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [recalculateHeights])

  // Ref callback for line elements
  const setLineRef = useCallback(
    (columnId: string, lineIndex: number, element: HTMLElement | null) => {
      if (!lineRefs.current.has(columnId)) {
        lineRefs.current.set(columnId, new Map())
      }

      const columnRefs = lineRefs.current.get(columnId)!
      const previousElement = columnRefs.get(lineIndex)

      // Unobserve previous element
      if (previousElement && observerRef.current) {
        observerRef.current.unobserve(previousElement)
      }

      if (element) {
        columnRefs.set(lineIndex, element)
        // Observe new element
        observerRef.current?.observe(element)
      } else {
        columnRefs.delete(lineIndex)
      }

      // Recalculate after refs change
      recalculateHeights()
    },
    [recalculateHeights]
  )

  const getLineHeight = useCallback(
    (lineIndex: number) => lineHeights[lineIndex],
    [lineHeights]
  )

  return {
    setLineRef,
    getLineHeight,
    lineHeights,
    updateCount,
  }
}
