// Copyright (C) 2019 Agoric, under Apache License 2.0

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

// We will change the API to take the message as an optional argument; e.g.,

//   insist(sky.isBlue(), details`${sky.color} should be blue`);

// The details helper will be available as a direct import and as insist.details.
// It returns an object that can print itself with the formatted message, or when 
// complain is invoked, will report the real details to the console but include 
// only the typeof information in the exception to prevent revealing secrets up 
// the exception path.
function details(template, ...args) {
  const complainer = harden({
    complain() {
      const interleaved = [template[0]];
      const parts = [template[0]];
      for (let i = 0; i < args.length; i += 1) {
        interleaved.push(args[i], template[i + 1]);
        parts.push('(', an(typeof args[i]), ')', template[i + 1]);
      }
      if (args.length >= 1) {
        parts.push('\nSee console for error data.');
      }
      console.error(...interleaved);
      return new Error(parts.join(''));
    },
  });
  return complainer;
}

// Fail an assertion, recording details to the console and
// raising an exception with just type information.
//
// The optional `details` can be a string for backwards compatibility
// with nodejs assertion library.
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
// ```assert(expr, details`....`);```
// If expr is falsy, then the template contents are reported to the
// console and also in a thrown error.
//
// The literal portions of the template are assumed non-sensitive, as
// are the `typeof` types of the substitution values. These are
// assembles into the thrown error message. The actual contents of the
// substitution values are assumed sensitive, to be revealed to the
// console only. We assume only the virtual platform's owner can read
// what is written to the console, where the owner is in a privileged
// position over computation running on that platform.
//
// The optional `details` can be a string for backwards compatibility
// with nodejs assertion library.
function assert(flag, optDetails = details`check failed`) {
  if (!flag) {
    console.log(`FAILED ASSERTION ${flag}`);
    fail(optDetails);
  }
}
assert.details = details;

// Assert that two values must be `===`. 
function equal(actual, expected, optDetails = details`Expected ${actual} === ${expected}`) {
  assert(actual === expected, optDetails);
}
assert.equal = equal;

harden(assert);
export { assert, details, an };