# Insist

Throw (using provided error message) if expression is false.


```js
insist(expr)`custom error message`;
```

If expr is falsy, then the template contents are reported to the
console and also in a thrown error.

The literal portions of the template are assumed non-sensitive, as
are the typeof types of the substitution values. These are
assembles into the thrown error message. The actual contents of the
substitution values are assumed sensitive, to be revealed to the
console only. We assume only the virtual platform's owner can read
what is written to the console, where the owner is in a privileged
position over computation running on that platform.
