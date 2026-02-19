// ─── Expression Parser ──────────────────────────────────────────
// Recursive-descent parser for user-defined vector field functions.
// Compiles math expressions like "sin(x*0.05) * cos(y*0.03)" into
// a closure (vars) => number for fast per-cell evaluation.
//
// Built-in variables: x, y, r, theta, pi, e
// Built-in functions: sin, cos, tan, atan2, sqrt, abs, exp, log,
//                     tanh, sign, min, max, pow

// ─── Types ──────────────────────────────────────────────────────

export type ExprNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { type: 'unary'; op: '-'; operand: ExprNode }
  | { type: 'call'; name: string; args: ExprNode[] };

export class ParseError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = 'ParseError';
  }
}

// ─── Tokenizer ──────────────────────────────────────────────────

interface Token {
  type: 'number' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof';
  value: string;
  pos: number;
}

const ALLOWED_VARS = new Set(['x', 'y', 'r', 'theta', 'pi', 'e']);
const ALLOWED_FUNCS: Record<string, Function> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  atan2: Math.atan2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,
  tanh: Math.tanh,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
};

// Sorted longest-first for greedy prefix matching
const FUNC_NAMES_BY_LENGTH = Object.keys(ALLOWED_FUNCS).sort((a, b) => b.length - a.length);
const VAR_NAMES_BY_LENGTH = [...ALLOWED_VARS].sort((a, b) => b.length - a.length);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === ' ' || ch === '\t') { i++; continue; }

    if ((ch >= '0' && ch <= '9') || ch === '.') {
      const start = i;
      while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) i++;
      tokens.push({ type: 'number', value: input.slice(start, i), pos: start });
      continue;
    }

    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      const start = i;
      while (i < input.length && ((input[i] >= 'a' && input[i] <= 'z') || (input[i] >= 'A' && input[i] <= 'Z') || (input[i] >= '0' && input[i] <= '9') || input[i] === '_')) i++;
      tokens.push({ type: 'ident', value: input.slice(start, i), pos: start });
      continue;
    }

    if (ch === '(') { tokens.push({ type: 'lparen', value: '(', pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ')', pos: i }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ',', pos: i }); i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ type: 'op', value: ch, pos: i }); i++; continue;
    }

    throw new ParseError(`Unexpected character '${ch}'`, i);
  }

  tokens.push({ type: 'eof', value: '', pos: input.length });
  return tokens;
}

// ─── Preprocessing (implied multiplication & compound splitting) ─

/**
 * Recursively split a compound identifier like "sinx" into known
 * functions/variables: ["sin", "x"]. Returns null if unsplittable.
 */
function splitIdentifier(name: string, pos: number): Token[] | null {
  if (ALLOWED_VARS.has(name) || name in ALLOWED_FUNCS) {
    return [{ type: 'ident', value: name, pos }];
  }

  // Try function prefixes first (longest match wins)
  for (const func of FUNC_NAMES_BY_LENGTH) {
    if (name.length > func.length && name.startsWith(func)) {
      const rest = splitIdentifier(name.slice(func.length), pos + func.length);
      if (rest) return [{ type: 'ident', value: func, pos }, ...rest];
    }
  }

  // Then variable prefixes (longest match wins)
  for (const v of VAR_NAMES_BY_LENGTH) {
    if (name.length > v.length && name.startsWith(v)) {
      const rest = splitIdentifier(name.slice(v.length), pos + v.length);
      if (rest) return [{ type: 'ident', value: v, pos }, ...rest];
    }
  }

  return null;
}

/**
 * Two-phase token preprocessing:
 * 1. Split compound identifiers (e.g. "sinx" → "sin", "x")
 * 2. Insert implicit "*" where multiplication is implied
 *    (e.g. "2x" → "2 * x", "x(" → "x * (", ")x" → ") * x")
 */
function preprocessTokens(tokens: Token[]): Token[] {
  // Phase 1: Split compound identifiers
  let result: Token[] = [];
  for (const tok of tokens) {
    if (tok.type === 'ident' && !ALLOWED_VARS.has(tok.value) && !(tok.value in ALLOWED_FUNCS)) {
      const parts = splitIdentifier(tok.value, tok.pos);
      if (parts) {
        result.push(...parts);
      } else {
        result.push(tok); // Unknown — parser will produce the error
      }
    } else {
      result.push(tok);
    }
  }

  // Phase 2: Insert implicit multiplication
  const final: Token[] = [];
  for (let i = 0; i < result.length; i++) {
    final.push(result[i]);
    if (i + 1 >= result.length) continue;

    const curr = result[i];
    const next = result[i + 1];

    // Current token categories
    const currIsVar = curr.type === 'ident' && ALLOWED_VARS.has(curr.value);
    const currIsNum = curr.type === 'number';
    const currIsRParen = curr.type === 'rparen';

    // Next token categories
    const nextIsIdent = next.type === 'ident';
    const nextIsNum = next.type === 'number';
    const nextIsLParen = next.type === 'lparen';

    // Insert * between tokens that imply multiplication.
    // Function idents (sin, cos, …) are excluded as "curr" because
    // the parser handles implicit function calls (e.g. sin x → sin(x)).
    const needsMul =
      (currIsNum && (nextIsIdent || nextIsLParen)) ||
      (currIsRParen && (nextIsNum || nextIsIdent || nextIsLParen)) ||
      (currIsVar && (nextIsNum || nextIsIdent || nextIsLParen));

    if (needsMul) {
      final.push({ type: 'op', value: '*', pos: next.pos });
    }
  }

  return final;
}

// ─── Parser ─────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private expect(type: Token['type'], value?: string): Token {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new ParseError(
        `Expected ${value || type}, got '${t.value || 'end of input'}'`,
        t.pos,
      );
    }
    return this.advance();
  }

  parse(): ExprNode {
    const node = this.parseExpr();
    if (this.peek().type !== 'eof') {
      throw new ParseError(
        `Unexpected '${this.peek().value}' after expression`,
        this.peek().pos,
      );
    }
    return node;
  }

  // expr -> term (('+' | '-') term)*
  private parseExpr(): ExprNode {
    let left = this.parseTerm();
    while (this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value;
      const right = this.parseTerm();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  // term -> power (('*' | '/') power)*
  private parseTerm(): ExprNode {
    let left = this.parsePower();
    while (this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value;
      const right = this.parsePower();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }

  // power -> unary ('^' unary)?
  private parsePower(): ExprNode {
    let left = this.parseUnary();
    if (this.peek().type === 'op' && this.peek().value === '^') {
      this.advance();
      const right = this.parseUnary();
      left = { type: 'binary', op: '^', left, right };
    }
    return left;
  }

  // unary -> '-' unary | call
  private parseUnary(): ExprNode {
    if (this.peek().type === 'op' && this.peek().value === '-') {
      this.advance();
      const operand = this.parseUnary();
      return { type: 'unary', op: '-', operand };
    }
    return this.parseCall();
  }

  // call -> IDENT '(' expr (',' expr)* ')' | IDENT unary | primary
  private parseCall(): ExprNode {
    if (this.peek().type === 'ident' && this.peek().value in ALLOWED_FUNCS) {
      const name = this.peek().value;
      if (this.pos + 1 < this.tokens.length && this.tokens[this.pos + 1].type === 'lparen') {
        // Standard function call: func(args)
        this.advance();
        this.expect('lparen');
        const args: ExprNode[] = [];
        if (this.peek().type !== 'rparen') {
          args.push(this.parseExpr());
          while (this.peek().type === 'comma') {
            this.advance();
            args.push(this.parseExpr());
          }
        }
        this.expect('rparen');
        return { type: 'call', name, args };
      } else {
        // Implicit function call without parens: sin x → sin(x)
        // Parses the next unary expression as the single argument,
        // so "sin -x" → sin(-x), "sin cos x" → sin(cos(x))
        this.advance();
        const arg = this.parseUnary();
        return { type: 'call', name, args: [arg] };
      }
    }
    return this.parsePrimary();
  }

  // primary -> NUMBER | IDENT | '(' expr ')'
  private parsePrimary(): ExprNode {
    const t = this.peek();

    if (t.type === 'number') {
      this.advance();
      const value = parseFloat(t.value);
      if (isNaN(value)) throw new ParseError(`Invalid number '${t.value}'`, t.pos);
      return { type: 'number', value };
    }

    if (t.type === 'ident') {
      this.advance();
      if (!ALLOWED_VARS.has(t.value) && !(t.value in ALLOWED_FUNCS)) {
        throw new ParseError(`Unknown variable '${t.value}'`, t.pos);
      }
      return { type: 'variable', name: t.value };
    }

    if (t.type === 'lparen') {
      this.advance();
      const node = this.parseExpr();
      this.expect('rparen');
      return node;
    }

    throw new ParseError(
      `Unexpected '${t.value || 'end of input'}'`,
      t.pos,
    );
  }
}

// ─── Public API ─────────────────────────────────────────────────

export function parseExpression(input: string): ExprNode {
  if (!input.trim()) throw new ParseError('Empty expression', 0);
  const raw = tokenize(input);
  const tokens = preprocessTokens(raw);
  return new Parser(tokens).parse();
}

/**
 * Compile an AST into a closure for fast evaluation.
 * The closure takes a vars object with: x, y, r, theta, pi, e.
 */
export function compileExpression(node: ExprNode): (vars: Record<string, number>) => number {
  switch (node.type) {
    case 'number': {
      const v = node.value;
      return () => v;
    }
    case 'variable': {
      const name = node.name;
      return (vars) => vars[name] ?? 0;
    }
    case 'binary': {
      const left = compileExpression(node.left);
      const right = compileExpression(node.right);
      switch (node.op) {
        case '+': return (vars) => left(vars) + right(vars);
        case '-': return (vars) => left(vars) - right(vars);
        case '*': return (vars) => left(vars) * right(vars);
        case '/': return (vars) => { const r = right(vars); return r === 0 ? 0 : left(vars) / r; };
        case '^': return (vars) => Math.pow(left(vars), right(vars));
        default: return () => 0;
      }
    }
    case 'unary':
      const operand = compileExpression(node.operand);
      return (vars) => -operand(vars);
    case 'call': {
      const fn = ALLOWED_FUNCS[node.name] as (...args: number[]) => number;
      const argFns = node.args.map(compileExpression);
      return (vars) => {
        const args = argFns.map((f) => f(vars));
        const result = fn(...args);
        return isFinite(result) ? result : 0;
      };
    }
  }
}
