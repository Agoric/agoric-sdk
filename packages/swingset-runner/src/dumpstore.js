import fs from 'fs';
import process from 'process';

/* eslint-disable no-use-before-define */
export function dumpStore(store, outfile, rawMode) {
  let out;
  if (outfile) {
    out = fs.createWriteStream(outfile);
  } else {
    out = process.stdout;
  }

  const state = new Map();
  for (const key of store.getKeys('', '~')) {
    const value = store.get(key);
    if (rawMode) {
      pkv(key, value);
    } else {
      state.set(key, value);
    }
  }
  if (rawMode) {
    process.exit(0);
  }

  const initialized = popt('initialized');
  if (initialized) {
    gap();
  }

  popt('runQueue');
  gap();

  p('// device info');
  popt('device.nextID');
  const devNames = JSON.parse(popt('device.names'));
  const devs = new Map();
  for (const dn of devNames) {
    const d = popt(`device.name.${dn}`);
    devs.set(dn, d);
  }
  gap();

  p('// kernel devices');
  popt('kd.nextID');
  pgroup('kd');
  gap();

  for (const [dn, d] of devs.entries()) {
    p(`// device ${d} (${dn})`);
    popt(`${d}.o.nextID`);
    for (const key of groupKeys(`${d}.c.kd`)) {
      const val = popt(key);
      popt(`${d}.c.${val}`);
    }
  }
  gap();

  p('// vat info');
  popt('vat.nextID');
  const vatNames = JSON.parse(popt('vat.names'));
  const vats = new Map();
  for (const vn of vatNames) {
    const v = popt(`vat.name.${vn}`);
    vats.set(vn, v);
  }
  gap();

  p('// kernel objects');
  popt('ko.nextID');
  pgroup('ko');
  gap();
  p('// kernel promises');
  popt('kp.nextID');
  pgroup('kp');
  gap();

  let starting = true;
  for (const [vn, v] of vats.entries()) {
    if (starting) {
      starting = false;
    } else {
      gap();
    }
    p(`// vat ${v} (${vn})`);
    popt(`${v}.d.nextID`);
    popt(`${v}.o.nextID`);
    popt(`${v}.p.nextID`);
    popt(`${v}.t.nextID`);
    for (const key of groupKeys(`${v}.c.kd`)) {
      const val = popt(key);
      popt(`${v}.c.${val}`);
    }
    for (const key of groupKeys(`${v}.c.ko`)) {
      const val = popt(key);
      popt(`${v}.c.${val}`);
    }
    for (const key of groupKeys(`${v}.c.kp`)) {
      const val = popt(key);
      popt(`${v}.c.${val}`);
    }
    pgroup(`${v}.t.`);
  }

  starting = true;
  for (const key of groupKeys('')) {
    if (starting) {
      gap();
      p('// other state');
      starting = false;
    }
    popt(key);
  }

  function p(str) {
    out.write(str);
    out.write('\n');
  }

  function pkv(key, value) {
    p(`${key} :: ${value}`);
  }

  function gap() {
    p('');
  }

  function* groupKeys(baseKey) {
    const subkeys = Array.from(state.keys()).sort();
    const end = `${baseKey}~`;
    for (const key of subkeys) {
      if (baseKey <= key && key < end) {
        yield key;
      }
    }
  }

  function pgroup(baseKey) {
    for (const key of groupKeys(baseKey)) {
      pkv(key, state.get(key));
      state.delete(key);
    }
  }

  function popt(key) {
    if (state.has(key)) {
      const value = state.get(key);
      pkv(key, value);
      state.delete(key);
      return value;
    } else {
      return undefined;
    }
  }
}
