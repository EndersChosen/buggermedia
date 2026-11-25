/**
 * Safe scoring-expression language.
 *
 * AI-generated score cards describe their scoring math as small expressions
 * such as `bid == tricks ? 20 * bid : -10 * abs(bid - tricks)`. Those strings
 * come from a language model (and indirectly from user-uploaded rule books),
 * so they are never run with `eval`/`new Function`. Instead they are parsed
 * into an AST here and evaluated by a tiny interpreter that only knows about
 * numbers, a fixed set of operators, and a whitelist of functions.
 *
 * Grammar (lowest to highest precedence):
 *   ternary     := or ( '?' ternary ':' ternary )?
 *   or          := and ( ('||' | 'or') and )*
 *   and         := equality ( ('&&' | 'and') equality )*
 *   equality    := comparison ( ('==' | '===' | '!=' | '!==') comparison )*
 *   comparison  := additive ( ('<' | '<=' | '>' | '>=') additive )*
 *   additive    := multiplicative ( ('+' | '-') multiplicative )*
 *   multiplicative := unary ( ('*' | '/' | '%') unary )*
 *   unary       := ('-' | '+' | '!' | 'not') unary | primary
 *   primary     := number | 'true' | 'false' | identifier | call | '(' ternary ')'
 *   call        := identifier '(' ( ternary ( ',' ternary )* )? ')'
 */

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'id'; name: string }
  | { kind: 'unary'; op: '-' | '+' | '!'; arg: Expr }
  | { kind: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { kind: 'ternary'; test: Expr; then: Expr; else: Expr }
  | { kind: 'call'; name: string; args: Expr[] };

type BinaryOp = '+' | '-' | '*' | '/' | '%' | '<' | '<=' | '>' | '>=' | '==' | '!=' | '&&' | '||';

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpressionError';
  }
}

/** Functions that operate on plain numbers. */
const SCALAR_FUNCTIONS: Record<string, { min: number; max: number; fn: (...a: number[]) => number }> = {
  abs: { min: 1, max: 1, fn: Math.abs },
  floor: { min: 1, max: 1, fn: Math.floor },
  ceil: { min: 1, max: 1, fn: Math.ceil },
  round: { min: 1, max: 1, fn: Math.round },
  sign: { min: 1, max: 1, fn: Math.sign },
  min: { min: 1, max: 20, fn: (...a) => Math.min(...a) },
  max: { min: 1, max: 20, fn: (...a) => Math.max(...a) },
  clamp: { min: 3, max: 3, fn: (v, lo, hi) => Math.min(Math.max(v, lo), hi) },
  if: { min: 3, max: 3, fn: (c, a, b) => (c ? a : b) },
};

/**
 * Functions that look across every player in the current round (rounds-style
 * cards only). The argument is evaluated once per player with that player's
 * values, e.g. `maxAll(points)` or `maxAll(hearts + 13 * queen)`.
 */
export const AGGREGATE_FUNCTIONS = ['sumAll', 'maxAll', 'minAll', 'countAll', 'rankOf'] as const;
export type AggregateFunction = (typeof AGGREGATE_FUNCTIONS)[number];

const AGGREGATES = new Set<string>(AGGREGATE_FUNCTIONS);

export const ALL_FUNCTION_NAMES = [...Object.keys(SCALAR_FUNCTIONS), ...AGGREGATE_FUNCTIONS];

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: 'num'; value: number; pos: number }
  | { type: 'id'; value: string; pos: number }
  | { type: 'op'; value: string; pos: number }
  | { type: 'eof'; pos: number };

const MULTI_CHAR_OPS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||'];
const SINGLE_CHAR_OPS = '+-*/%<>!?:(),';

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const match = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(i));
      if (!match) throw new ExpressionError(`Invalid number at position ${i + 1}`);
      tokens.push({ type: 'num', value: Number(match[0]), pos: i });
      i += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))!;
      tokens.push({ type: 'id', value: match[0], pos: i });
      i += match[0].length;
      continue;
    }
    const multi = MULTI_CHAR_OPS.find((op) => source.startsWith(op, i));
    if (multi) {
      tokens.push({ type: 'op', value: multi, pos: i });
      i += multi.length;
      continue;
    }
    if (SINGLE_CHAR_OPS.includes(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character "${ch}" at position ${i + 1}`);
  }
  tokens.push({ type: 'eof', pos: source.length });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const MAX_EXPRESSION_LENGTH = 2000;
const MAX_DEPTH = 64;

export function parseExpression(source: string): Expr {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new ExpressionError('Expression is empty');
  }
  if (source.length > MAX_EXPRESSION_LENGTH) {
    throw new ExpressionError(`Expression is longer than ${MAX_EXPRESSION_LENGTH} characters`);
  }

  const tokens = tokenize(source);
  let pos = 0;
  let depth = 0;

  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const isOp = (value: string) => {
    const t = peek();
    return t.type === 'op' && t.value === value;
  };
  const isWord = (value: string) => {
    const t = peek();
    return t.type === 'id' && t.value === value;
  };
  const expectOp = (value: string) => {
    const t = next();
    if (t.type !== 'op' || t.value !== value) {
      throw new ExpressionError(`Expected "${value}" at position ${t.pos + 1}`);
    }
  };
  const enter = () => {
    if (++depth > MAX_DEPTH) throw new ExpressionError('Expression is nested too deeply');
  };
  const leave = () => {
    depth--;
  };

  function ternary(): Expr {
    enter();
    const test = or();
    if (isOp('?')) {
      next();
      const thenExpr = ternary();
      expectOp(':');
      const elseExpr = ternary();
      leave();
      return { kind: 'ternary', test, then: thenExpr, else: elseExpr };
    }
    leave();
    return test;
  }

  function or(): Expr {
    let left = and();
    while (isOp('||') || isWord('or')) {
      next();
      left = { kind: 'binary', op: '||', left, right: and() };
    }
    return left;
  }

  function and(): Expr {
    let left = equality();
    while (isOp('&&') || isWord('and')) {
      next();
      left = { kind: 'binary', op: '&&', left, right: equality() };
    }
    return left;
  }

  function equality(): Expr {
    let left = comparison();
    while (isOp('==') || isOp('===') || isOp('!=') || isOp('!==')) {
      const raw = (next() as { value: string }).value;
      const op: BinaryOp = raw.startsWith('!') ? '!=' : '==';
      left = { kind: 'binary', op, left, right: comparison() };
    }
    return left;
  }

  function comparison(): Expr {
    let left = additive();
    while (isOp('<') || isOp('<=') || isOp('>') || isOp('>=')) {
      const op = (next() as { value: string }).value as BinaryOp;
      left = { kind: 'binary', op, left, right: additive() };
    }
    return left;
  }

  function additive(): Expr {
    let left = multiplicative();
    while (isOp('+') || isOp('-')) {
      const op = (next() as { value: string }).value as BinaryOp;
      left = { kind: 'binary', op, left, right: multiplicative() };
    }
    return left;
  }

  function multiplicative(): Expr {
    let left = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = (next() as { value: string }).value as BinaryOp;
      left = { kind: 'binary', op, left, right: unary() };
    }
    return left;
  }

  function unary(): Expr {
    if (isOp('-') || isOp('+') || isOp('!') || isWord('not')) {
      const raw = (next() as { value: string }).value;
      enter();
      const arg = unary();
      leave();
      const op = raw === 'not' ? '!' : (raw as '-' | '+' | '!');
      return { kind: 'unary', op, arg };
    }
    return primary();
  }

  function primary(): Expr {
    const t = next();
    if (t.type === 'num') return { kind: 'num', value: t.value };
    if (t.type === 'op' && t.value === '(') {
      const inner = ternary();
      expectOp(')');
      return inner;
    }
    if (t.type === 'id') {
      if (t.value === 'true') return { kind: 'num', value: 1 };
      if (t.value === 'false') return { kind: 'num', value: 0 };
      if (isOp('(')) {
        next();
        const args: Expr[] = [];
        if (!isOp(')')) {
          args.push(ternary());
          while (isOp(',')) {
            next();
            args.push(ternary());
          }
        }
        expectOp(')');
        return checkCall(t.value, args, t.pos);
      }
      return { kind: 'id', name: t.value };
    }
    if (t.type === 'eof') throw new ExpressionError('Expression ended unexpectedly');
    throw new ExpressionError(`Unexpected "${t.value}" at position ${t.pos + 1}`);
  }

  function checkCall(name: string, args: Expr[], at: number): Expr {
    if (AGGREGATES.has(name)) {
      if (args.length !== 1) {
        throw new ExpressionError(`${name}() takes exactly one argument, e.g. ${name}(points)`);
      }
      if (usesAggregates(args[0])) {
        throw new ExpressionError(`${name}() can't contain another aggregate function`);
      }
      return { kind: 'call', name, args };
    }
    const spec = SCALAR_FUNCTIONS[name];
    if (!spec) {
      throw new ExpressionError(
        `Unknown function "${name}" at position ${at + 1}. Allowed: ${ALL_FUNCTION_NAMES.join(', ')}`
      );
    }
    if (args.length < spec.min || args.length > spec.max) {
      throw new ExpressionError(`${name}() got ${args.length} argument(s)`);
    }
    return { kind: 'call', name, args };
  }

  const result = ternary();
  if (peek().type !== 'eof') {
    const t = peek() as Token & { value?: unknown };
    throw new ExpressionError(`Unexpected "${String(t.value)}" at position ${t.pos + 1}`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Static analysis
// ---------------------------------------------------------------------------

/** Every bare identifier the expression reads (not counting function names). */
export function collectIdentifiers(expr: Expr, out = new Set<string>()): Set<string> {
  switch (expr.kind) {
    case 'id':
      out.add(expr.name);
      break;
    case 'unary':
      collectIdentifiers(expr.arg, out);
      break;
    case 'binary':
      collectIdentifiers(expr.left, out);
      collectIdentifiers(expr.right, out);
      break;
    case 'ternary':
      collectIdentifiers(expr.test, out);
      collectIdentifiers(expr.then, out);
      collectIdentifiers(expr.else, out);
      break;
    case 'call':
      expr.args.forEach((a) => collectIdentifiers(a, out));
      break;
  }
  return out;
}

/** Whether the expression uses any cross-player aggregate function. */
export function usesAggregates(expr: Expr): boolean {
  switch (expr.kind) {
    case 'call':
      return AGGREGATES.has(expr.name) || expr.args.some(usesAggregates);
    case 'unary':
      return usesAggregates(expr.arg);
    case 'binary':
      return usesAggregates(expr.left) || usesAggregates(expr.right);
    case 'ternary':
      return usesAggregates(expr.test) || usesAggregates(expr.then) || usesAggregates(expr.else);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export interface EvalScope {
  /** Values of plain identifiers (fields, `round`, `players`, ...). */
  vars: Record<string, number>;
  /**
   * For aggregate functions: every player's identifier values, in player
   * order. Only available on rounds-style cards.
   */
  perPlayer?: Array<Record<string, number>>;
}

export function evaluate(expr: Expr, scope: EvalScope): number {
  const result = evalNode(expr, scope);
  if (!Number.isFinite(result)) {
    throw new ExpressionError('Expression did not produce a finite number');
  }
  // Avoid floating point dust like 0.30000000000000004 in totals.
  return Math.round(result * 1e9) / 1e9;
}

function evalNode(expr: Expr, scope: EvalScope): number {
  switch (expr.kind) {
    case 'num':
      return expr.value;
    case 'id': {
      if (!Object.prototype.hasOwnProperty.call(scope.vars, expr.name)) {
        throw new ExpressionError(`Unknown name "${expr.name}"`);
      }
      return scope.vars[expr.name];
    }
    case 'unary': {
      const v = evalNode(expr.arg, scope);
      if (expr.op === '-') return -v;
      if (expr.op === '+') return v;
      return v ? 0 : 1;
    }
    case 'ternary':
      return evalNode(expr.test, scope) ? evalNode(expr.then, scope) : evalNode(expr.else, scope);
    case 'binary': {
      if (expr.op === '&&') return evalNode(expr.left, scope) && evalNode(expr.right, scope) ? 1 : 0;
      if (expr.op === '||') return evalNode(expr.left, scope) || evalNode(expr.right, scope) ? 1 : 0;
      const a = evalNode(expr.left, scope);
      const b = evalNode(expr.right, scope);
      switch (expr.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          if (b === 0) throw new ExpressionError('Division by zero');
          return a / b;
        case '%':
          if (b === 0) throw new ExpressionError('Division by zero');
          return a % b;
        case '<':
          return a < b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
        case '==':
          return a === b ? 1 : 0;
        case '!=':
          return a !== b ? 1 : 0;
      }
      throw new ExpressionError(`Unsupported operator ${expr.op as string}`);
    }
    case 'call': {
      if (AGGREGATES.has(expr.name)) {
        const arg = expr.args[0];
        if (!scope.perPlayer) {
          throw new ExpressionError(`${expr.name}() is only available on rounds score cards`);
        }
        const values = scope.perPlayer.map((vars) => evalNode(arg, { vars }));
        switch (expr.name as AggregateFunction) {
          case 'sumAll':
            return values.reduce((s, v) => s + v, 0);
          case 'maxAll':
            return values.length ? Math.max(...values) : 0;
          case 'minAll':
            return values.length ? Math.min(...values) : 0;
          case 'countAll':
            return values.filter((v) => v !== 0).length;
          case 'rankOf': {
            // 1 = highest value. Ties share the better rank.
            const own = evalNode(arg, { vars: scope.vars });
            return 1 + values.filter((v) => v > own).length;
          }
        }
      }
      const spec = SCALAR_FUNCTIONS[expr.name];
      return spec.fn(...expr.args.map((a) => evalNode(a, scope)));
    }
  }
}

/** Convenience: parse and evaluate in one go (parsing is cached). */
const parseCache = new Map<string, Expr>();
export function evaluateSource(source: string, scope: EvalScope): number {
  let ast = parseCache.get(source);
  if (!ast) {
    ast = parseExpression(source);
    if (parseCache.size > 500) parseCache.clear();
    parseCache.set(source, ast);
  }
  return evaluate(ast, scope);
}
