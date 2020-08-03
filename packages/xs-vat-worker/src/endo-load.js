/* global Compartment */

function debug(..._args) {
  // console.log(...args);
}

function SESCompartment(endowments, map, options) {
  debug('SESCompartment', { endowments, map, options });
  const sesGlobals = { harden, console, Compartment: SESCompartment };
  return new Compartment({ ...sesGlobals, ...endowments }, map, options);
}

export function loadMain(compartmap) {
  // ISSUE: doesn't seem to work: const { entries, fromEntries, keys } = Object;
  // debug('entries, ...', { entries: typeof entries, fromEntries: typeof fromEntries, keys: typeof keys });
  const entries = o => Object.entries(o);
  const fromEntries = pvs => Object.fromEntries(pvs);
  const keys = o => Object.keys(o);

  const memoize = f => {
    const cache = {};
    return k => cache[k] || (cache[k] = f(k));
  };
  const unjs = spec => spec.replace(/\.js$/, '');
  const unrel = spec => spec.replace(/^\.\//, '/');
  const join = (base, ref) => `${base}${unjs(ref.slice(2))}`;
  const pkgCompartment = memoize(loc => {
    const intraPkg = ref => {
      debug('intraPkg', { loc, ref });
      return [unjs(unrel(ref).slice(1)), join(loc, ref)];
    };
    function interPkg([specifier, { compartment, module }]) {
      const pc = pkgCompartment(compartment);
      const fullSpecifier = unjs(module.slice(2));
      // const fullSpecifier = join(compartment, module);
      debug('interPkg', {
        loc,
        specifier,
        compartment,
        module,
        fullSpecifier,
      });
      return [specifier, pc.importNow(fullSpecifier)];
    }
    const { contents, modules } = compartmap.compartments[loc];
    const cmap = fromEntries([
      ...contents.map(intraPkg),
      ...entries(modules).map(interPkg),
    ]);
    debug({ loc, contents, modules: keys(modules), map: cmap });
    return new SESCompartment({}, cmap);
  });
  return pkgCompartment(compartmap.main);
}
