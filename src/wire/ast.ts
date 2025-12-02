// Wire Language AST Types

export interface Port {
  name: string
  width: number // default 1 for single bit
}

export interface Module {
  name: string
  inputs: Port[]
  outputs: Port[]
  statements: Statement[]
}

export interface Statement {
  target: string
  expr: Expr
}

export type Expr =
  | IdentExpr
  | CallExpr
  | MemberExpr
  | IndexExpr
  | SliceExpr
  | NumberExpr

export interface IdentExpr {
  kind: 'ident'
  name: string
}

export interface CallExpr {
  kind: 'call'
  name: string
  args: Expr[]
}

export interface MemberExpr {
  kind: 'member'
  object: Expr
  field: string
}

export interface IndexExpr {
  kind: 'index'
  object: Expr
  index: number
}

export interface SliceExpr {
  kind: 'slice'
  object: Expr
  start: number
  end: number
}

export interface NumberExpr {
  kind: 'number'
  value: number
}

// Helper constructors
export const ident = (name: string): IdentExpr => ({ kind: 'ident', name })
export const call = (name: string, args: Expr[]): CallExpr => ({ kind: 'call', name, args })
export const member = (object: Expr, field: string): MemberExpr => ({ kind: 'member', object, field })
export const index = (object: Expr, idx: number): IndexExpr => ({ kind: 'index', object, index: idx })
export const slice = (object: Expr, start: number, end: number): SliceExpr => ({ kind: 'slice', object, start, end })
export const num = (value: number): NumberExpr => ({ kind: 'number', value })
