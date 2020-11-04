// Copyright (C) 2019 Agoric, under Apache License 2.0
/* global globalThis */
// @ts-check

// This module assumes the existence of a non-standard `assert` host object.
// SES version 0.11.0 introduces this global object and entangles it
// with the `console` host object in scope when it initializes,
// allowing errors, particularly assertion errors, to hide their "details"
// from callers that might catch those errors, then reveal them to the
// underlying console.
// To the extent that this `console` is considered a resource,
// this module must be considered a resource module.

import './types';

const globalAssert = globalThis.assert;

if (globalAssert === undefined) {
  throw new Error(
    `Cannot initialize @agoric/assert, missing globalThis.assert`,
  );
}

const missing = [
  'fail',
  'equal',
  'typeof',
  'string',
  'note',
  'details',
  'quote',
].filter(name => globalAssert[name] === undefined);
if (missing.length > 0) {
  throw new Error(
    `Cannot initialize @agoric/assert, missing globalThis.assert methods ${missing.join(
      ', ',
    )}`,
  );
}

/**
 * Prepend the correct indefinite article onto a noun, typically a typeof result
 * e.g., "an Object" vs. "a Number"
 *
 * @deprecated
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
function quote(payload) {
  return globalAssert.quote(payload);
}
harden(quote);

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
  return globalAssert.details(template, ...args);
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
  return globalAssert.fail(optDetails);
}
// hardened under combinedAssert

/* eslint-disable jsdoc/require-returns-check,jsdoc/valid-types */
/**
 * @param {*} flag The truthy/falsy value
 * @param {Details} [optDetails] The details to throw
 * @returns {asserts flag}
 */
/* eslint-enable jsdoc/require-returns-check,jsdoc/valid-types */
function assert(flag, optDetails = details`Check failed`) {
  globalAssert(flag, optDetails);
}
// hardened under combinedAssert

/**
 * Assert that two values must be `Object.is`.
 *
 * @template T
 * @param {T} actual The value we received
 * @param {T} expected What we wanted
 * @param {Details} [optDetails] The details to throw
 * @returns {void}
 */
function equal(
  actual,
  expected,
  optDetails = details`Expected ${actual} is same as ${expected}`,
) {
  globalAssert.equal(actual, expected, optDetails);
}
// hardened under combinedAssert

/**
 * Assert an expected typeof result.
 *
 * @type {AssertTypeof}
 * @param {any} specimen The value to get the typeof
 * @param {TypeName} typeName The expected name
 * @param {Details} [optDetails] The details to throw
 */
const assertTypeof = (specimen, typeName, optDetails) =>
  /** @type {function(any, TypeName, Details): void} */
  globalAssert.typeof(specimen, typeName, optDetails);
// hardened under combinedAssert

/**
 * @param {any} specimen The value to get the typeof
 * @param {Details} [optDetails] The details to throw
 */
const string = (specimen, optDetails) =>
  assertTypeof(specimen, 'string', optDetails);
// hardened under combinedAssert

/**
 * Adds debugger details to an error that will be inaccessible to any stack
 * that catches the error but will be revealed to the console.
 *
 * @param {Error} error
 * @param {Details} detailsNote
 */
const note = (error, detailsNote) => globalAssert.note(error, detailsNote);
// hardened under combinedAssert

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
 * @type {typeof assert & {
 *   typeof: AssertTypeof,
 *   fail: typeof fail,
 *   equal: typeof equal,
 *   string: typeof string,
 *   note: typeof note,
 *   details: typeof details,
 *   quote: typeof quote
 * }}
 */
/* eslint-enable jsdoc/valid-types */
const combinedAssert = Object.assign(assert, {
  fail,
  equal,
  typeof: assertTypeof,
  string,
  note,
  details,
  quote,
});
harden(combinedAssert);

export { combinedAssert as assert, details, an, quote };

// DEPRECATED: Going forward we encourage the pattern over importing the
// abbreviation 'q' for quote.
//
// ```js
// import { quote as q, details as d } from '@agoric/assert';
// ```
export { quote as q };
