// Copyright (C) 2019 Agoric, under Apache License 2.0

// @ts-check

import './types';

/*
// TODO Somehow, use the `assert` exported by the SES-shim
import { assert } from 'ses';
const { details, quote } = assert;
export { assert, details, quote, quote as q };
*/

// This module assumes the de-facto standard `console` host object.
// To the extent that this `console` is considered a resource,
// this module must be considered a resource module.

/**
 * Prepend the correct indefinite article onto a noun, typically a typeof result
 * e.g., "an Object" vs. "a Number"
 *
 * @param {string} str The noun to prepend
 * @returns {string} The noun prepended with a/an
 */
function an(str) {
  str = `${str}`;
  if (str.length >= 1 && 'aeiouAEIOU'.includes(str[0])) {
    return `an ${str}`;
  }
  return `a ${str}`;
}
harden(an);

/**
 * Like `JSON.stringify` but does not blow up if given a cycle. This is not
 * intended to be a serialization to support any useful unserialization,
 * or any programmatic use of the resulting string. The string is intended
 * only for showing a human, in order to be informative enough for some
 * logging purposes. As such, this `cycleTolerantStringify` has an
 * imprecise specification and may change over time.
 *
 * The current `cycleTolerantStringify` possibly emits too many "seen"
 * markings: Not only for cycles, but also for repeated subtrees by
 * object identity.
 *
 * @param {any} payload
 */
function cycleTolerantStringify(payload) {
  const seenSet = new Set();
  const replacer = (_, val) => {
    if (typeof val === 'object' && val !== null) {
      if (seenSet.has(val)) {
        return '<**seen**>';
      }
      seenSet.add(val);
    }
    return val;
  };
  return JSON.stringify(payload, replacer);
}

const declassifiers = new WeakMap();

/**
 * To "declassify" and quote a substitution value used in a
 * details`...` template literal, enclose that substitution expression
 * in a call to `q`. This states that the argument should appear quoted (with
 * `JSON.stringify`), in the error message of the thrown error. The payload
 * itself is still passed unquoted to the console as it would be without q.
 *
 * Starting from the example in the `details` comment, say instead that the
 * color the sky is supposed to be is also computed. Say that we still don't
 * want to reveal the sky's actual color, but we do want the thrown error's
 * message to reveal what color the sky was supposed to be:
 * ```js
 * assert.equal(
 *   sky.color,
 *   color,
 *   details`${sky.color} should be ${q(color)}`,
 * );
 * ```
 *
 * @typedef {Object} StringablePayload
 * @property {() => string} toString How to print the payload
 *
 * @param {*} payload What to declassify
 * @returns {StringablePayload} The declassified payload
 */
function q(payload) {
  // Don't harden the payload
  const result = Object.freeze({
    toString: Object.freeze(() => cycleTolerantStringify(payload)),
  });
  declassifiers.set(result, payload);
  return result;
}
harden(q);

/**
 * Use the `details` function as a template literal tag to create
 * informative error messages. The assertion functions take such messages
 * as optional arguments:
 * ```js
 * assert(sky.isBlue(), details`${sky.color} should be "blue"`);
 * ```
 * The details template tag returns an object that can print itself with the
 * formatted message in two ways. It will report the real details to the
 * console but include only the typeof information in the thrown error
 * to prevent revealing secrets up the exceptional path. In the example
 * above, the thrown error may reveal only that `sky.color` is a string,
 * whereas the same diagnostic printed to the console reveals that the
 * sky was green.
 *
 * WARNING: this function currently returns an unhardened result, as hardening
 * proved to cause significant performance degradation.  Consequently, callers
 * should take care to use it only in contexts where this lack of hardening
 * does not present a hazard.  In current usage, a `details` template literal
 * may only appear either as an argument to `assert`, where we know hardening
 * won't matter, or inside another hardened object graph, where hardening is
 * already ensured.  However, there is currently no means to enfoce these
 * constraints, so users are required to employ this function with caution.
 * Our intent is to eventually have a lint rule that will check for
 * inappropriate uses or find an alternative means of implementing `details`
 * that does not encounter the performance issue.  The final disposition of
 * this is being discussed and tracked in issue #679 in the agoric-sdk
 * repository.
 *
 * @typedef {Object} Complainer An object that has custom assert behaviour
 * @property {() => Error} complain Return an Error to throw, and print details to console
 *
 * @typedef {string|Complainer} Details Either a plain string, or made by details``
 *
 * @param {TemplateStringsArray | string[]} template The template to format
 * @param {any[]} args Arguments to the template
 * @returns {Complainer} The complainer for these details
 */
function details(template, ...args) {
  // const complainer = harden({  // remove harden per above discussion
  const complainer = {
    complain() {
      const interleaved = [template[0]];
      const parts = [template[0]];
      for (let i = 0; i < args.length; i += 1) {
        let arg = args[i];
        let argStr;
        if (declassifiers.has(arg)) {
          argStr = `${arg}`;
          arg = declassifiers.get(arg);
        } else {
          argStr = `(${an(typeof arg)})`;
        }

        // Remove the extra spaces (since console.error puts them
        // between each interleaved).
        const priorWithoutSpace = (interleaved.pop() || '').replace(/ $/, '');
        if (priorWithoutSpace !== '') {
          interleaved.push(priorWithoutSpace);
        }

        const nextWithoutSpace = template[i + 1].replace(/^ /, '');
        interleaved.push(arg, nextWithoutSpace);

        parts.push(argStr, template[i + 1]);
      }
      if (interleaved[interleaved.length - 1] === '') {
        interleaved.pop();
      }
      const err = new Error(parts.join(''));
      console.error('LOGGED ERROR:', ...interleaved, err);
      // eslint-disable-next-line no-debugger
      debugger;
      return err;
    },
  };
  // });
  return complainer;
}
harden(details);

/**
 * Fail an assertion, recording details to the console and
 * raising an exception with just type information.
 *
 * The optional `optDetails` can be a string for backwards compatibility
 * with the nodejs assertion library.
 *
 * @param {Details} [optDetails] The details of what was asserted
 */
function fail(optDetails = details`Assert failed`) {
  if (typeof optDetails === 'string') {
    // If it is a string, use it as the literal part of the template so
    // it doesn't get quoted.
    optDetails = details([optDetails]);
  }
  throw optDetails.complain();
}

/* eslint-disable jsdoc/require-returns-check,jsdoc/valid-types */
/**
 * @param {*} flag The truthy/falsy value
 * @param {Details} [optDetails] The details to throw
 * @returns {asserts flag}
 */
/* eslint-enable jsdoc/require-returns-check,jsdoc/valid-types */
function assert(flag, optDetails = details`Check failed`) {
  if (!flag) {
    throw fail(optDetails);
  }
}

/**
 * Assert that two values must be `Object.is`.
 *
 * @param {*} actual The value we received
 * @param {*} expected What we wanted
 * @param {Details} [optDetails] The details to throw
 * @returns {void}
 */
function equal(
  actual,
  expected,
  optDetails = details`Expected ${actual} is same as ${expected}`,
) {
  assert(Object.is(actual, expected), optDetails);
}

/**
 * Assert an expected typeof result.
 *
 * @type {AssertTypeof}
 * @param {any} specimen The value to get the typeof
 * @param {string} typename The expected name
 * @param {Details} [optDetails] The details to throw
 */
const assertTypeof = (specimen, typename, optDetails) => {
  assert(
    typeof typename === 'string',
    details`${q(typename)} must be a string`,
  );
  if (optDetails === undefined) {
    // Like
    // ```js
    // optDetails = details`${specimen} must be ${q(an(typename))}`;
    // ```
    // except it puts the typename into the literal part of the template
    // so it doesn't get quoted.
    optDetails = details(['', ` must be ${an(typename)}`], specimen);
  }
  equal(typeof specimen, typename, optDetails);
};

/* eslint-disable jsdoc/valid-types */
/**
 * assert that expr is truthy, with an optional details to describe
 * the assertion. It is a tagged template literal like
 * ```js
 * assert(expr, details`....`);`
 * ```
 * If expr is falsy, then the template contents are reported to the
 * console and also in a thrown error.
 *
 * The literal portions of the template are assumed non-sensitive, as
 * are the `typeof` types of the substitution values. These are
 * assembled into the thrown error message. The actual contents of the
 * substitution values are assumed sensitive, to be revealed to the
 * console only. We assume only the virtual platform's owner can read
 * what is written to the console, where the owner is in a privileged
 * position over computation running on that platform.
 *
 * The optional `optDetails` can be a string for backwards compatibility
 * with the nodejs assertion library.
 *
 * @type {typeof assert & { typeof: AssertTypeof, fail: typeof fail, equal: typeof equal }}
 */
/* eslint-enable jsdoc/valid-types */
const assertCombined = Object.assign(assert, {
  equal,
  fail,
  typeof: assertTypeof,
});
harden(assertCombined);

export { assertCombined as assert, details, q, an };
