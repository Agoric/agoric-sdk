import objectInspectSources from '../dist/src-object-inspect.js';

// Ensure the object inspector is confined.
const c = new Compartment();
harden(c.globalThis);

// Transform the imported inspector module source string into an evaluable
// string.  We could have played more games with bundlers to do something less
// fragile, but even so, SES should fail-safe if this replacement doesn't match.
//
// The goal (presuming the file ends with a single export default statement):
//   `...\n  export default harden(inspect0);`
// becomes:
//   `...\n  /* export default */ harden(inspect0);`
// and we can evaluate it to obtain the completion value as the object inspector.
const src = objectInspectSources.replace(
  /(^|\s)(export\s+default)(\s+)/g,
  '$1/* $2 */$3',
);
const objectInspect = c.evaluate(
  `${src}\n//# sourceURL=xsnap-lockdown/lib/object-inspect.js\n`,
);

export default objectInspect;
