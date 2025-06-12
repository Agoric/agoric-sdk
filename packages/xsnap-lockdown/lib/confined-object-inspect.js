import objectInspectSources from '../dist/object-inspect.js';

// Ensure the object inspector is confined.
const c = new Compartment();
harden(c.globalThis);

const objectInspect = c.evaluate(`(${objectInspectSources.source})`)().default;

export default objectInspect;
