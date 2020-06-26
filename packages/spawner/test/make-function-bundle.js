// Produce a compatible bundle from a standalone function (no free variables,
// no tildot). When imported, the function will be available as ns.default .
// This allows other package unit tests to create bundles for import-bundle
// without using a separate file for each function.

export function bundleFunction(f) {
  if (typeof f !== 'function') {
    throw Error('bundleFunction takes a function');
  }
  const fSource = `${f}`;
  const source = `function getExport() { return { default: ${fSource} }; }`;
  return { source, moduleFormat: 'getExport' };
}
