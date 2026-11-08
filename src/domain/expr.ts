// The derivation language for mapping rules (shared with the CDM Query & Edit-Check Console's
// check language). Its own tokenizer, parser and evaluator: no eval, no Function, no access to
// anything except the values and functions the context provides.
//
//   concat(STUDYID, '-', SUBJID)
//   iso(VSDAT, VSTIM)
//   if(contains(RACE, ';'), 'MULTIPLE', upper(RACE))
//
// Values are strings (as collected) or numbers. Blank is ''. Comparisons with a blank are false.

export type Val = string | number | boolean | null
type Tok = { t: 'num' | 'str' | 'id' | 'op' | 'lp' | 'rp' | 'comma'; v: string; pos: number }

export class ExprError extends Error { constructor(msg: string, public pos: number) { super(msg) } }

const OPS = ['<=', '>=', '!=', '<>', '=', '<', '>', '+', '-', '*', '/']
export function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) { i++; continue }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++
      const v = src.slice(i, j); if (!/^\d+(\.\d+)?$|^\.\d+$/.test(v)) throw new ExprError(`Bad number "${v}"`, i)
      out.push({ t: 'num', v, pos: i }); i = j; continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1; while (j < src.length && src[j] !== c) j++
      if (j >= src.length) throw new ExprError('Unclosed text', i)
      out.push({ t: 'str', v: src.slice(i + 1, j), pos: i }); i = j + 1; continue
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++
      out.push({ t: 'id', v: src.slice(i, j), pos: i }); i = j; continue
    }
    if (c === '(') { out.push({ t: 'lp', v: c, pos: i }); i++; continue }
    if (c === ')') { out.push({ t: 'rp', v: c, pos: i }); i++; continue }
    if (c === ',') { out.push({ t: 'comma', v: c, pos: i }); i++; continue }
    const op = OPS.find((o) => src.startsWith(o, i))
    if (op) { out.push({ t: 'op', v: op === '<>' ? '!=' : op, pos: i }); i += op.length; continue }
    throw new ExprError(`Unexpected "${c}"`, i)
  }
  return out
}

export type Node =
  | { k: 'lit'; v: Val }
  | { k: 'var'; name: string }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'un'; op: 'not' | '-'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }

export function parse(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const isKw = (w: string) => peek()?.t === 'id' && peek().v.toLowerCase() === w
  const expect = (t: Tok['t']) => { const k = toks[p]; if (!k || k.t !== t) throw new ExprError(`Expected ${t === 'rp' ? '")"' : t}`, k?.pos ?? src.length); p++; return k }
  const or = (): Node => { let a = and(); while (isKw('or')) { p++; a = { k: 'bin', op: 'or', a, b: and() } } return a }
  const and = (): Node => { let a = not(); while (isKw('and')) { p++; a = { k: 'bin', op: 'and', a, b: not() } } return a }
  const not = (): Node => { if (isKw('not')) { p++; return { k: 'un', op: 'not', a: not() } } return cmp() }
  const cmp = (): Node => {
    const a = add()
    const k = peek()
    if (k?.t === 'op' && ['=', '!=', '<', '<=', '>', '>='].includes(k.v)) { p++; return { k: 'bin', op: k.v, a, b: add() } }
    if (isKw('in')) { p++; expect('lp'); const items: Node[] = [add()]; while (peek()?.t === 'comma') { p++; items.push(add()) } expect('rp'); return { k: 'call', name: '__in', args: [a, ...items] } }
    return a
  }
  const add = (): Node => { let a = mul(); while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) { const op = toks[p++].v; a = { k: 'bin', op, a, b: mul() } } return a }
  const mul = (): Node => { let a = unary(); while (peek()?.t === 'op' && (peek().v === '*' || peek().v === '/')) { const op = toks[p++].v; a = { k: 'bin', op, a, b: unary() } } return a }
  const unary = (): Node => { if (peek()?.t === 'op' && peek().v === '-') { p++; return { k: 'un', op: '-', a: unary() } } return atom() }
  const atom = (): Node => {
    const k = toks[p]
    if (!k) throw new ExprError('Unexpected end', src.length)
    if (k.t === 'num') { p++; return { k: 'lit', v: Number(k.v) } }
    if (k.t === 'str') { p++; return { k: 'lit', v: k.v } }
    if (k.t === 'lp') { p++; const e = or(); expect('rp'); return e }
    if (k.t === 'id') {
      p++
      const low = k.v.toLowerCase()
      if (low === 'true' || low === 'false') return { k: 'lit', v: low === 'true' }
      if (low === 'blank' || low === 'null') return { k: 'lit', v: '' }
      if (peek()?.t === 'lp') {
        p++; const args: Node[] = []
        if (peek()?.t !== 'rp') { args.push(or()); while (peek()?.t === 'comma') { p++; args.push(or()) } }
        expect('rp'); return { k: 'call', name: k.v, args }
      }
      return { k: 'var', name: k.v }
    }
    throw new ExprError(`Unexpected "${k.v}"`, k.pos)
  }
  const e = or()
  if (p < toks.length) throw new ExprError(`Unexpected "${toks[p].v}"`, toks[p].pos)
  return e
}

export interface Ctx {
  get(name: string): string
  fn: Record<string, (...a: Val[]) => Val>
}

const blank = (v: Val) => v === '' || v === null || v === undefined
const num = (v: Val): number | null => {
  if (typeof v === 'number') return v
  if (typeof v === 'boolean' || blank(v)) return null
  const n = Number(v); return Number.isFinite(n) && /^\s*-?\d*\.?\d+\s*$/.test(String(v)) ? n : null
}
const truthy = (v: Val) => v === true || (typeof v === 'number' && v !== 0) || v === 'Y'
const DATE = /^\d{4}-\d{2}-\d{2}$/

function compare(op: string, a: Val, b: Val): boolean {
  if (op === '=' || op === '!=') {
    const na = num(a), nb = num(b)
    const eq = na !== null && nb !== null ? na === nb : String(a ?? '').toUpperCase() === String(b ?? '').toUpperCase()
    return op === '=' ? eq : !eq
  }
  if (blank(a) || blank(b)) return false
  const na = num(a), nb = num(b)
  if (na !== null && nb !== null) return op === '<' ? na < nb : op === '<=' ? na <= nb : op === '>' ? na > nb : na >= nb
  const sa = String(a), sb = String(b)
  if (DATE.test(sa) && DATE.test(sb)) return op === '<' ? sa < sb : op === '<=' ? sa <= sb : op === '>' ? sa > sb : sa >= sb
  return false
}

export const BUILTINS: Record<string, (...a: Val[]) => Val> = {
  present: (x) => !blank(x),
  isblank: (x) => blank(x),
  any: (...xs) => xs.some(truthy),
  all: (...xs) => xs.every(truthy),
  abs: (x) => { const n = num(x); return n === null ? '' : Math.abs(n) },
  round: (x, d) => { const n = num(x), k = num(d) ?? 0; return n === null ? '' : Math.round(n * 10 ** k) / 10 ** k },
  isnum: (x) => blank(x) || num(x) !== null,
  isdate: (x) => blank(x) || (typeof x === 'string' && DATE.test(x) && !Number.isNaN(Date.parse(x + 'T00:00:00Z')) && new Date(x + 'T00:00:00Z').toISOString().slice(0, 10) === x),
  days: (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || !DATE.test(a) || !DATE.test(b)) return ''
    return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
  },
  adddays: (a, n) => { const k = num(n); if (typeof a !== 'string' || !DATE.test(a.slice(0, 10)) || k === null) return ''; return new Date(Date.parse(a.slice(0, 10) + 'T00:00:00Z') + k * 86400000).toISOString().slice(0, 10) },
  year: (x) => (typeof x === 'string' && /^\d{4}/.test(x) ? Number(x.slice(0, 4)) : ''),
  len: (x) => String(x ?? '').length,
  contains: (s, sub) => String(s ?? '').toUpperCase().includes(String(sub ?? '').toUpperCase()),
  upper: (x) => String(x ?? '').toUpperCase(),
  // pattern(x, 'K####'): # is a digit, A a letter, anything else must match itself.
  pattern: (x, p) => {
    const s = String(x ?? ''), q = String(p ?? '')
    if (blank(s)) return true
    return s.length === q.length && [...q].every((c, i) => (c === '#' ? /\d/.test(s[i]) : c === 'A' ? /[A-Za-z]/.test(s[i]) : c === s[i]))
  },
  __in: (x, ...xs) => xs.some((y) => compare('=', x, y)),
  // Text and choice functions for derivations.
  concat: (...xs) => xs.map((x) => (blank(x) ? '' : fmt(x))).join(''),
  if: (c, a, b) => (truthy(c) ? a : b ?? ''),
  coalesce: (...xs) => xs.find((x) => !blank(x)) ?? '',
  lower: (x) => String(x ?? '').toLowerCase(),
  trim: (x) => String(x ?? '').trim(),
  substr: (x, start, n) => { const s = String(x ?? ''), a = (num(start) ?? 1) - 1; return num(n) === null ? s.slice(a) : s.slice(a, a + (num(n) as number)) },
  replace: (x, a, b) => String(x ?? '').split(String(a ?? '')).join(String(b ?? '')),
  // The nth piece of a text cut into lines of at most width characters at spaces, as long text is
  // split into COVAL, COVAL1, … or TSVAL, TSVAL1, … without breaking words.
  wrap: (x, width, n) => {
    const w = num(width) ?? 200, k = num(n) ?? 1, parts: string[] = []
    let rest = String(x ?? '').trim()
    while (rest) { if (rest.length <= w) { parts.push(rest); break } let cut = rest.lastIndexOf(' ', w); if (cut <= 0) cut = w; parts.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim() }
    return parts[k - 1] ?? ''
  },
  part: (x, sep, n) => { const p = String(x ?? '').split(String(sep ?? '')); const i = num(n) ?? 1; return i >= 1 && i <= p.length ? p[i - 1].trim() : '' },
  num: (x) => num(x) ?? '',
  str: (x) => (blank(x) ? '' : fmt(x)),
  min: (...xs) => { const v = xs.filter((x) => !blank(x)); if (!v.length) return ''; return v.every((x) => num(x) !== null) ? Math.min(...v.map((x) => num(x) as number)) : v.map(String).sort()[0] },
  max: (...xs) => { const v = xs.filter((x) => !blank(x)); if (!v.length) return ''; return v.every((x) => num(x) !== null) ? Math.max(...v.map((x) => num(x) as number)) : v.map(String).sort().pop()! },
}
// Numbers print without float noise (0.1 + 0.2 prints 0.3); text is unchanged.
export function fmt(x: Val): string {
  if (typeof x === 'number') return Number.isInteger(x) ? String(x) : String(Number(x.toFixed(10)))
  if (typeof x === 'boolean') return x ? 'Y' : 'N'
  return x === null || x === undefined ? '' : String(x)
}
const KNOWN_FN = new Set(Object.keys(BUILTINS)) // includes __in, which the parser makes from "x in (…)"

export function evaluate(n: Node, ctx: Ctx): Val {
  switch (n.k) {
    case 'lit': return n.v
    case 'var': { const v = ctx.get(n.name); return typeof v === 'string' || typeof v === 'number' ? v : '' }
    case 'un': {
      if (n.op === 'not') return !truthy(evaluate(n.a, ctx))
      const v = num(evaluate(n.a, ctx)); return v === null ? '' : -v
    }
    case 'bin': {
      if (n.op === 'and') return truthy(evaluate(n.a, ctx)) && truthy(evaluate(n.b, ctx))
      if (n.op === 'or') return truthy(evaluate(n.a, ctx)) || truthy(evaluate(n.b, ctx))
      const a = evaluate(n.a, ctx), b = evaluate(n.b, ctx)
      if (['+', '-', '*', '/'].includes(n.op)) {
        const x = num(a), y = num(b)
        if (x === null || y === null) return ''
        if (n.op === '/') return y === 0 ? '' : x / y
        return n.op === '+' ? x + y : n.op === '-' ? x - y : x * y
      }
      return compare(n.op, a, b)
    }
    case 'call': {
      const key = n.name.toLowerCase()
      const own = (o: Record<string, (...a: Val[]) => Val>, k: string) => (Object.hasOwn(o, k) ? o[k] : undefined)
      const f = own(BUILTINS, key) ?? own(ctx.fn, n.name) ?? own(ctx.fn, key)
      if (!f) throw new ExprError(`Unknown function ${n.name}()`, 0)
      return f(...n.args.map((a) => evaluate(a, ctx)))
    }
  }
}

export const truth = truthy
export const isBlank = blank
export const toNum = num

// Validate a source string against the names a check may use. Returns an error message or ''.
export function validate(src: string, fields: string[], ctxFns: string[]): string {
  try {
    const n = parse(src)
    const walk = (x: Node): string => {
      if (x.k === 'var' && !fields.includes(x.name)) return `Unknown field ${x.name}`
      if (x.k === 'call' && !KNOWN_FN.has(x.name.toLowerCase()) && !ctxFns.includes(x.name)) return `Unknown function ${x.name}()`
      if (x.k === 'call') for (const a of x.args) { const e = walk(a); if (e) return e }
      if (x.k === 'un') return walk(x.a)
      if (x.k === 'bin') return walk(x.a) || walk(x.b)
      return ''
    }
    return walk(n)
  } catch (e) { return (e as Error).message }
}
