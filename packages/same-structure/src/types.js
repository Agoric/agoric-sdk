/**
 * @typedef {"*" | "or" | "and" | "<" | "<=" | "==" | ">=" | ">" } PatternKind
 */

/**
 * @typedef {Comparable} PatternRecord
 *
 * A pass-by-copy record with a property named '@pattern' (aka `PATTERN_KIND`)
 * whose value is a PatternKind.
 * TODO How do I declare a property whose name is not an indentifier?
 * TODO For each specified PatternKind, we should declare here what that
 * specific pattern record looks like. For example, the `'*'` pattern is
 * otherwise empty. `'or'` and `'and'` have a `subPatterns` property, and
 * the magnitude comparison operators have a ground `rightOperand`
 * property.
 */

/**
 * @typedef {Comparable} Ground
 *
 * A Comparable is Ground if its pass-by-copy superstructure has no
 * PatternRecords. Therefore, a Passable is only Ground if it has
 * neither PatternRecords nor Promises.
 */

/**
 * @typedef {Comparable} Pattern
 *
 * We say that a Comparable is a Pattern when it is used in a context
 * sensitive to whether it is ground.
 *
 * In these contexts, a Pattern represents the abstract set of Ground
 * Comparables that match it. If the Pattern is itself Ground, then it matches
 * only Ground Comparables that are `sameStructure` equivalent to it. If
 * the Pattern is non-Ground, then it matches or not according to
 * the Pattern's embedded PatternRecords.
 */
