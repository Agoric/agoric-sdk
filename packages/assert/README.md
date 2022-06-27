# assert - DEPRECATED

_**Deprecated** in favor of `assert` from SES_

An assertion library that keeps sensitive data outside of the Error.

Throw (using provided error message) if expression is false.
Assert that expr is truthy, with an optional details to describe
the assertion. It is a tagged template literal like
```js
assert(expr, details`....`);
```
If expr is falsy, then the template contents are reported to the
console and also in a thrown error.

The literal portions of the template are assumed non-sensitive, as
are the `typeof` types of the substitution values. These are
assembled into the thrown error message. The actual contents of the
substitution values are assumed sensitive, to be revealed to the
console only. We assume only the virtual platform's owner can read
what is written to the console, where the owner is in a privileged
position over computation running on that platform.

The optional `details` can be a string for backwards compatibility
with the nodejs assertion library.
