"use client"

import { useState, useCallback } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import type { Node as BabelNode } from "@babel/types"
import type { StatementBlock } from "@/lib/bytecode/types"
import { ZEBRA_COLORS, STATEMENT_HOVER_BG_COLOR, STATEMENT_HOVER_BORDER, STATEMENT_BORDER_BASE } from "@/lib/constants"

interface AstViewerProps {
  statements: StatementBlock[]
  hoveredStatementId: string | null
  onHoverStatement: (id: string | null) => void
}

export function AstViewer({ statements, hoveredStatementId, onHoverStatement }: AstViewerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-muted px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">AST</h2>
        <p className="text-xs text-muted-foreground">Abstract Syntax Tree</p>
      </div>
      <div className="flex-1 overflow-auto">
        {statements.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No statements to display
          </div>
        ) : (
          <div className="font-mono text-xs">
            {statements.map((statement) => {
              const isHovered = statement.id === hoveredStatementId
              const bandKey = statement.colorBand === 0 ? "band0" : "band1"
              const bgClass = isHovered
                ? STATEMENT_HOVER_BG_COLOR[bandKey]
                : ZEBRA_COLORS[bandKey].bg
              const borderColorClass = isHovered
                ? STATEMENT_HOVER_BORDER[bandKey].className
                : STATEMENT_HOVER_BORDER[bandKey].inactiveClassName

              return (
                <div
                  key={statement.id}
                  data-statement-id={statement.id}
                  data-color-band={statement.colorBand}
                  className={`border-b border-border/50 px-2 py-1 ${bgClass} ${STATEMENT_BORDER_BASE} ${borderColorClass}`}
                  onMouseEnter={() => onHoverStatement(statement.id)}
                  onMouseLeave={() => onHoverStatement(null)}
                >
                  <AstNode node={statement.node} depth={0} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface AstNodeProps {
  node: BabelNode
  depth: number
  keyName?: string
}

function AstNode({ node, depth, keyName }: AstNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)

  const toggle = useCallback(() => setExpanded((e) => !e), [])

  if (!node || typeof node !== "object") {
    return (
      <span className="text-emerald-700">
        {keyName && <span className="text-slate-500">{keyName}: </span>}
        {JSON.stringify(node)}
      </span>
    )
  }

  // Get relevant properties to display
  const displayProps = getDisplayProps(node)
  const childNodes = getChildNodes(node)
  const hasChildren = childNodes.length > 0

  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0 }}>
      <div
        className={`flex items-start gap-1 ${hasChildren ? "cursor-pointer" : ""}`}
        onClick={hasChildren ? toggle : undefined}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span>
          {keyName && <span className="text-slate-500">{keyName}: </span>}
          <span className="font-semibold text-blue-700">{node.type}</span>
          {displayProps.length > 0 && (
            <span className="text-slate-600">
              {" "}
              {"{ "}
              {displayProps.map(([key, value], i) => (
                <span key={key}>
                  {i > 0 && ", "}
                  <span className="text-purple-600">{key}</span>:{" "}
                  <span className="text-emerald-700">{JSON.stringify(value)}</span>
                </span>
              ))}
              {" }"}
            </span>
          )}
        </span>
      </div>
      {expanded && hasChildren && (
        <div>
          {childNodes.map(([key, child], index) =>
            Array.isArray(child) ? (
              <div key={`${key}-${index}`} style={{ marginLeft: 12 }}>
                <span className="text-slate-500">{key}: [</span>
                {child.map((item, i) => (
                  <AstNode key={i} node={item} depth={depth + 2} />
                ))}
                <span className="text-slate-500">]</span>
              </div>
            ) : (
              <AstNode key={`${key}-${index}`} node={child} depth={depth + 1} keyName={key} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function getDisplayProps(node: BabelNode): [string, unknown][] {
  const props: [string, unknown][] = []
  const n = node as Record<string, unknown>

  // Show simple value properties
  if ("name" in n && typeof n.name === "string") props.push(["name", n.name])
  if ("value" in n && (typeof n.value === "string" || typeof n.value === "number" || typeof n.value === "boolean"))
    props.push(["value", n.value])
  if ("operator" in n && typeof n.operator === "string") props.push(["operator", n.operator])
  if ("kind" in n && typeof n.kind === "string") props.push(["kind", n.kind])
  if ("raw" in n && typeof n.raw === "string" && !("value" in n)) props.push(["raw", n.raw])

  return props
}

function getChildNodes(node: BabelNode): [string, BabelNode | BabelNode[]][] {
  const children: [string, BabelNode | BabelNode[]][] = []
  const n = node as Record<string, unknown>

  const childKeys = [
    "body",
    "declarations",
    "init",
    "id",
    "expression",
    "left",
    "right",
    "argument",
    "arguments",
    "callee",
    "test",
    "consequent",
    "alternate",
    "params",
    "elements",
    "properties",
    "key",
    "value",
    "object",
    "property",
  ]

  for (const key of childKeys) {
    if (key in n && n[key] != null) {
      const value = n[key]
      if (Array.isArray(value) && value.length > 0 && value[0]?.type) {
        children.push([key, value as BabelNode[]])
      } else if (typeof value === "object" && "type" in (value as object)) {
        children.push([key, value as BabelNode])
      }
    }
  }

  return children
}
