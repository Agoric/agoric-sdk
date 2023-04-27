// @ts-check
import { makeMarshal, decodeToJustin } from '@endo/marshal';

const { keys, values, fromEntries } = Object;

const makeSet = (...args) => new Set(...args);

export const htmlStartCommentPattern = new RegExp(`(${'<'})(!--)`, 'g');
export const htmlEndCommentPattern = new RegExp(`(--)(${'>'})`, 'g');
export const importPattern = new RegExp(
  '(^|[^.])\\bimport(\\s*(?:\\(|/[/*]))',
  'g',
);

/**
 * Neutralize HTML comments and import expressions.
 *
 * @param {string} code
 */
export const defangEvaluableCode = code =>
  code
    .replace(importPattern, '$1import\\$2') // avoid SES_IMPORT_REJECTED
    .replace(htmlStartCommentPattern, '$1\\$2') // avoid SES_HTML_COMMENT_REJECTED
    .replace(htmlEndCommentPattern, '$1\\$2'); // avoid SES_HTML_COMMENT_REJECTED

/**
 * @param {string} code
 */
export const defangAndTrim = code => {
  // Remove SES evaluation hazards.
  const defanged = defangEvaluableCode(code);

  // End-of-line whitespace disrupts YAML formatting
  const trimmed = defanged.replace(/[\r\t ]+$/gm, '');

  return trimmed;
};

const { serialize } = makeMarshal();
export const stringify = (x, pretty = false) =>
  decodeToJustin(JSON.parse(serialize(harden(x)).body), pretty);

/**
 * @param {Record<string, unknown>} m
 */
export const mergePermits = m => {
  const isObj = o => o !== null && typeof o === 'object';
  const merge = (left, right) => {
    if (left === undefined) {
      return right;
    }
    if (right === undefined) return left;
    if (isObj(left)) {
      if (isObj(right)) {
        const k12 = [...makeSet([...keys(left), ...keys(right)])];
        const e12 = k12.map(k => [k, merge(left[k], right[k])]);
        return fromEntries(e12);
      } else {
        return left;
      }
    } else {
      return typeof left === 'string' ? left : right;
    }
  };
  return values(m).reduce(merge);
};
