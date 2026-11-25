import { describe, expect, it } from 'vitest';
import { collectIdentifiers, evaluateSource, ExpressionError, parseExpression } from '../expression';

const ev = (src: string, vars: Record<string, number> = {}) => evaluateSource(src, { vars });

describe('expression parser and evaluator', () => {
  it('handles arithmetic with correct precedence', () => {
    expect(ev('1 + 2 * 3')).toBe(7);
    expect(ev('(1 + 2) * 3')).toBe(9);
    expect(ev('10 - 4 - 3')).toBe(3);
    expect(ev('20 / 4 / 5')).toBe(1);
    expect(ev('7 % 3')).toBe(1);
    expect(ev('-2 * -3')).toBe(6);
    expect(ev('0.1 + 0.2')).toBe(0.3);
  });

  it('handles comparisons, logic and ternaries', () => {
    expect(ev('3 > 2')).toBe(1);
    expect(ev('3 == 3 && 2 != 2')).toBe(0);
    expect(ev('1 === 1 and not 0')).toBe(1);
    expect(ev('0 or 0')).toBe(0);
    expect(ev('bid == tricks ? 20 * bid : -10 * abs(bid - tricks)', { bid: 3, tricks: 3 })).toBe(60);
    expect(ev('bid == tricks ? 20 * bid : -10 * abs(bid - tricks)', { bid: 3, tricks: 1 })).toBe(-20);
    expect(ev('a ? b ? 1 : 2 : 3', { a: 1, b: 0 })).toBe(2);
  });

  it('supports whitelisted functions', () => {
    expect(ev('max(1, 5, 3)')).toBe(5);
    expect(ev('min(4, 2)')).toBe(2);
    expect(ev('floor(7 / 2) + ceil(0.1) + round(2.5)')).toBe(3 + 1 + 3);
    expect(ev('clamp(15, 0, 10)')).toBe(10);
    expect(ev('if(1, 4, 5)')).toBe(4);
  });

  it('evaluates aggregates across players', () => {
    const perPlayer = [
      { points: 26, queen: 1, hearts: 13 },
      { points: 0, queen: 0, hearts: 0 },
      { points: 0, queen: 0, hearts: 0 },
    ];
    const scope = { vars: perPlayer[1], perPlayer };
    expect(evaluateSource('sumAll(points)', scope)).toBe(26);
    expect(evaluateSource('maxAll(points)', scope)).toBe(26);
    expect(evaluateSource('minAll(points)', scope)).toBe(0);
    expect(evaluateSource('countAll(points)', scope)).toBe(1);
    expect(evaluateSource('rankOf(points)', scope)).toBe(2);
    // Per-player expressions inside aggregates
    expect(evaluateSource('maxAll(hearts + 13 * queen)', scope)).toBe(26);
    expect(evaluateSource('countAll(hearts == 13 && queen == 1)', scope)).toBe(1);
    // Aggregates are unavailable without per-player data
    expect(() => evaluateSource('sumAll(points)', { vars: { points: 1 } })).toThrow(/rounds/);
  });

  it('rejects unknown functions, bad syntax and code injection attempts', () => {
    expect(() => parseExpression('alert(1)')).toThrow(ExpressionError);
    expect(() => parseExpression('constructor.constructor("x")()')).toThrow(ExpressionError);
    expect(() => parseExpression('a.b')).toThrow(ExpressionError);
    expect(() => parseExpression('x = 1')).toThrow(ExpressionError);
    expect(() => parseExpression('1 +')).toThrow(ExpressionError);
    expect(() => parseExpression('(1 + 2')).toThrow(ExpressionError);
    expect(() => parseExpression('"text"')).toThrow(ExpressionError);
    expect(() => parseExpression('')).toThrow(ExpressionError);
    expect(() => parseExpression('sumAll(maxAll(points))')).toThrow(/another aggregate/);
    expect(() => parseExpression('sumAll(a, b)')).toThrow(/exactly one argument/);
    expect(() => parseExpression('max()')).toThrow(ExpressionError);
  });

  it('throws on unknown names, prototype keys and non-finite results', () => {
    expect(() => ev('missing + 1')).toThrow(/Unknown name/);
    expect(() => ev('toString')).toThrow(/Unknown name/);
    expect(() => ev('__proto__')).toThrow(/Unknown name/);
    expect(() => ev('1 / 0')).toThrow(/Division by zero/);
    expect(() => ev('5 % 0')).toThrow(/Division by zero/);
    expect(() => ev('1e308 * 10')).toThrow(/finite/);
  });

  it('limits size and nesting', () => {
    expect(() => parseExpression('1+'.repeat(1500) + '1')).toThrow(/longer than/);
    expect(() => parseExpression('('.repeat(100) + '1' + ')'.repeat(100))).toThrow(/nested too deeply/);
  });

  it('collects identifiers but not function names', () => {
    const ids = collectIdentifiers(parseExpression('max(bid, tricks) + sumAll(points) + round'));
    expect([...ids].sort()).toEqual(['bid', 'points', 'round', 'tricks']);
  });
});
