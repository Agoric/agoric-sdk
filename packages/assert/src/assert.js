// Copyright (C) 2019 Agoric, under Apache License 2.0

// This module assumes the de-facto standard `console` host object.
// To the extent that this `console` is considered a resource,
// this module must be considered a resource module.

import harden from '@agoric/harden';

// Prepend the correct indefinite article onto a noun, typically a typeof result
// e.g., "an Object" vs. "a Number"
function an(str) {
  str = `${str}`;
  if (str.length >= 1 && 'aeiouAEIOU'.includes(str[0])) {
    return `an ${str}`;
  }
  return `a ${str}`;
}
harden(an);

const declassifiers = new WeakSet();

// To "declassify" a substitution value used in a details`...` template literal,
// enclose that substitution expression in a call to openDetail. This states
// that the argument should appear, stringified, in the error message of the
// thrown error.
//
// Starting from the example in the `details` comment, say instead that the
// color the sky is supposed to be is also computed. Say that we still don't
// want to reveal the sky's actual color, but we do want the thrown error's
// message to reveal what color the sky was supposed to be:
// ```js
// assert.equal(
//   sky.color,
//   color,
//   details`${sky.color} should be ${openDetail(color)}`,
// );
// ```
function openDetail(payload) {
  const result = harden({
    payload,
    toString() {
      return payload.toString();
    },
  });
  declassifiers.add(result);
  return result;
}
harden(openDetail);

// Use the `details` function as a template literal tag to create
// informative error messages. The assertion functions take such messages
// as optional arguments:
// ```js
// assert(sky.isBlue(), details`${sky.color} should be blue`);
// ```
// The details template tag returns an object that can print itself with the
// formatted message in two ways. It will report the real details to the
// console but include only the typeof information in the thrown error
// to prevent revealing secrets up the exceptional path. In the example
// above, the thrown error may reveal only that `sky.color` is a string,
// whereas the same diagnostic printed to the console reveals that the
// sky was green.
//
// WARNING: this function currently returns an unhardened result, as hardening
// proved to cause significant performance degradation.  Consequently, callers
// should take care to use it only in contexts where this lack of hardening
// does not present a hazard.  In current usage, a `details` template literal
// may only appear either as an argument to `assert`, where we know hardening
// won't matter, or inside another hardened object graph, where hardening is
// already ensured.  However, there is currently no means to enfoce these
// constraints, so users are required to employ this function with caution.
// Our intent is to eventually have a lint rule that will check for
// inappropriate uses or find an alternative means of implementing `details`
// that does not encounter the performance issue.  The final disposition of
// this is being discussed and tracked in issue #679 in the agoric-sdk
// repository.
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
          arg = arg.payload;
          argStr = `${arg}`;
        } else {
          argStr = `(${an(typeof arg)})`;
        }

        // Remove the extra spaces (since console.error puts them
        // between each interleaved).
        const priorWithoutSpace = interleaved.pop().replace(/ $/, '');
        const nextWithoutSpace = template[i + 1].replace(/^ /, '');
        interleaved.push(priorWithoutSpace, arg, nextWithoutSpace);

        parts.push(argStr, template[i + 1]);
      }
      if (args.length >= 1) {
        parts.push('\nSee console for error data.');
      }
      console.error(...interleaved);
      return new Error(parts.join(''));
    },
  };
  // });
  return complainer;
}
harden(details);

// Fail an assertion, recording details to the console and
// raising an exception with just type information.
//
// The optional `optDetails` can be a string for backwards compatibility
// with the nodejs assertion library.
function fail(optDetails = details`Assert failed`) {
  if (typeof optDetails === 'string') {
    const detailString = `Assertion failed: ${optDetails}`;
    console.error(detailString);
    throw new Error(detailString);
  }
  throw optDetails.complain();
}

// assert that expr is truthy, with an optional details to describe
// the assertion. It is a tagged template literal like
// ```js
// assert(expr, details`....`);`
// ```
// If expr is falsy, then the template contents are reported to the
// console and also in a thrown error.
//
// The literal portions of the template are assumed non-sensitive, as
// are the `typeof` types of the substitution values. These are
// assembled into the thrown error message. The actual contents of the
// substitution values are assumed sensitive, to be revealed to the
// console only. We assume only the virtual platform's owner can read
// what is written to the console, where the owner is in a privileged
// position over computation running on that platform.
//
// The optional `optDetails` can be a string for backwards compatibility
// with the nodejs assertion library.
function assert(flag, optDetails = details`check failed`) {
  if (!flag) {
    console.log(`FAILED ASSERTION ${flag}`);
    fail(optDetails);
  }
}

// Assert that two values must be `===`.
function equal(
  actual,
  expected,
  optDetails = details`Expected ${actual} === ${expected}`,
) {
  assert(actual === expected, optDetails);
}

function assertTypeof(
  specimen,
  typename,
  optDetails = details`${specimen} must be ${openDetail(an(typename))}`,
) {
  assert(typeof typename === 'string', details`${typename} must be a string`);
  equal(typeof specimen, typename, optDetails);
}

assert.equal = equal;
assert.fail = fail;
assert.typeof = assertTypeof;
harden(assert);

export { assert, details, openDetail, an };
