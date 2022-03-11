import objectInspectSources from '../dist/src-object-inspect.js';

// Ensure the object inspector is confined.
const c = new Compartment();
harden(c.globalThis);

const src = objectInspectSources.replace(/(^|\s)(export\s+default)(\s+)/g, '$1/* $2 */$3');
const objectInspect = c.evaluate(`${src}\n//# sourceURL=xsnap/src/object-inspect.js\n`);

export default objectInspect;
