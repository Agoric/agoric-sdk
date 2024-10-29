/**
 * @import {HostCall} from './types.js';
 */

const { assign } = Object;

/** Doesn't need to be exhaustive, just a little prettier than JSON-quoting. */
const BEST_GUESS_ID_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

/**
 * Return an object that mimics a template strings array.
 *
 * @param {string[]} strings
 * @returns {TemplateStringsArray}
 */
export const makeTemplateStringsArray = strings =>
  harden(assign([...strings], { raw: strings }));
harden(makeTemplateStringsArray);

/**
 * When used as a template tag, this function returns its arguments verbatim.
 *
 * @template {any[]} A
 * @param  {A} allArgs
 * @returns {A}
 */
export const idTemplateTag = (...allArgs) => allArgs;
harden(idTemplateTag);

/**
 * Convert a replay membrane HostCall structure to template arguments.
 *
 * @param {HostCall} hostCall
 * @returns {[TemplateStringsArray, ...any[]]}
 */
export const hostCallToTemplateArgs = ({ target, method, eventual }) => {
  /** @type {string[]} */
  const tmpl = [];

  /** @type {any[]} */
  const args = [];

  const tpush = str => {
    tmpl.push(str);
  };
  const tappend = str => {
    tmpl[tmpl.length - 1] += str;
  };

  tpush(eventual ? 'E' : '');
  tappend('(');
  args.push(target);
  tpush(')');
  if (typeof method === 'string') {
    if (BEST_GUESS_ID_REGEX.test(method)) {
      tappend(`.${method}`);
    } else {
      tappend(`[${JSON.stringify(method)}]`);
    }
  } else if (method !== undefined) {
    tappend(`[${String(method)}]`);
  }
  tappend('(...)');

  return /** @type {const} */ ([makeTemplateStringsArray(tmpl), ...args]);
};
harden(hostCallToTemplateArgs);

/**
 * Template tag to flatten any nested template arguments by joining them to the
 * returned template strings and rest arguments.
 *
 * @param {TemplateStringsArray} tmpl
 * @param  {any[]} args
 * @returns {[TemplateStringsArray, ...any[]]}
 */
export const inlineTemplateArgs = (tmpl, ...args) => {
  /** @type {string[]} */
  const itmpl = [tmpl[0]];
  /** @type {any[]} */
  const iargs = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const nextStr = tmpl[i + 1];

    // Could be a template and argument list.
    const argLength = Array.isArray(arg) ? arg.length : 0;
    /** @type {string[] & { raw: string[] } | undefined} */
    const t = argLength && arg[0] ? arg[0] : undefined;
    if (
      !Array.isArray(t) ||
      !Array.isArray(t.raw) ||
      t.length !== argLength ||
      t.raw.length !== argLength ||
      !t.every(v => typeof v === 'string') ||
      !t.raw.every(v => typeof v === 'string')
    ) {
      // Not a template string array shape, so just push it.
      iargs.push(arg);
      nextStr === undefined || itmpl.push(nextStr);
      continue;
    }

    // Join the current outer template string with the first inner one.
    itmpl[itmpl.length - 1] += t[0];

    // Push the rest of the inner template strings and arguments.
    itmpl.push(...t.slice(1));
    iargs.push(...arg.slice(1));

    if (nextStr !== undefined) {
      // Join the last inner template string with the next outer one.
      itmpl[itmpl.length - 1] += nextStr;
    }
  }

  return /** @type {const} */ ([makeTemplateStringsArray(itmpl), ...iargs]);
};
harden(inlineTemplateArgs);
