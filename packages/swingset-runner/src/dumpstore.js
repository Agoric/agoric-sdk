import fs from 'fs';
import process from 'process';

/* eslint-disable no-use-before-define */
export function dumpStore(kernelStorage, outfile, rawMode, truncate = true) {
  const transcriptStore = kernelStorage.transcriptStore;
  let out;
  if (outfile) {
    out = fs.createWriteStream(outfile);
  } else {
    out = process.stdout;
  }

  const state = new Map();
  for (const key of kernelStorage.kvStore.getKeys('', '~')) {
    const value = kernelStorage.kvStore.get(key);
    if (rawMode) {
      pkv(key, value);
    } else {
      state.set(key, value);
    }
  }
  if (rawMode) {
    return;
  }

  const initialized = popt('initialized');
  if (initialized) {
    gap();
  }

  const runQueue = JSON.parse(eat('runQueue'));
  if (runQueue.length === 0) {
    p('runQueue :: []');
  } else {
    p('runQueue :: [');
    let idx = 1;
    for (const entry of runQueue) {
      const comma = idx === runQueue.length ? '' : ',';
      idx += 1;
      p(`  ${JSON.stringify(entry)}${comma}`);
    }
    p(']');
  }

  popt('crankNumber');
  popt('kernel.defaultManagerType');
  popt('kernel.defaultReapInterval');
  popt('pinnedObjects');
  popt('vatAdminRootKref');
  popt('gcActions');
  popt('reapQueue');
  popt('meter.nextID');
  popt('activityhash');
  popt('kernelStats');
  popt('local.kernelStats');
  gap();

  p('// bundles');
  poptBig('bundle', 'kernelBundle');
  poptBig('bundle', 'lockdownBundle');
  poptBig('bundle', 'supervisorBundle');
  for (const key of groupKeys('bundle.')) {
    poptBig('bundle', key);
  }
  gap();

  p('// device info');
  popt('device.nextID');
  const devs = new Map();
  const devNamesRaw = popt('device.names');
  if (devNamesRaw) {
    const devNames = JSON.parse(devNamesRaw);
    for (const dn of devNames) {
      const d = popt(`device.name.${dn}`);
      devs.set(dn, d);
    }
    gap();
  }

  p('// kernel devices');
  popt('kd.nextID');
  pgroup('kd');
  gap();

  let starting = true;
  for (const [dn, d] of devs.entries()) {
    if (starting) {
      starting = false;
    } else {
      gap();
    }
    p(`// device ${d} (${dn})`);
    popt(`${d}.options`);
    poptBig('bundle', `${d}.source`);
    popt(`${d}.o.nextID`);
    popt(`${d}.deviceState`);
    for (const key of groupKeys(`${d}.c.kd`)) {
      const val = popt(key);
      popt(`${d}.c.${val}`);
    }
    for (const key of groupKeys(`${d}.c.ko`)) {
      const val = popt(key);
      popt(`${d}.c.${val}`);
    }
  }
  gap();

  p('// vat info');
  popt('vat.nextID');
  const vatDynamicIDsRaw = popt('vat.dynamicIDs');
  const vats = new Map();
  const vatNamesRaw = popt('vat.names');
  if (vatNamesRaw) {
    const vatNames = JSON.parse(vatNamesRaw);
    for (const vn of vatNames) {
      const v = popt(`vat.name.${vn}`);
      vats.set(vn, v);
    }
  }
  if (vatDynamicIDsRaw) {
    const vatDynamicIDs = JSON.parse(vatDynamicIDsRaw);
    for (const vdid of vatDynamicIDs) {
      vats.set(`dynamic-${vdid}`, vdid);
    }
  }
  if (vatNamesRaw || vatDynamicIDsRaw) {
    gap();
  }

  p('// kernel objects');
  popt('ko.nextID');
  pgroup('ko');
  gap();
  p('// kernel promises');
  popt('kp.nextID');
  pgroup('kp');
  gap();

  const vatInfo = [];
  starting = true;
  for (const [vn, v] of vats.entries()) {
    if (starting) {
      starting = false;
    } else {
      gap();
    }
    p(`// vat ${v} (${vn})`);
    popt(`${v}.options`);
    poptBig('bundle', `${v}.source`);
    popt(`${v}.d.nextID`);
    popt(`${v}.o.nextID`);
    popt(`${v}.p.nextID`);
    popt(`${v}.nextDeliveryNum`);
    popt(`${v}.reapInterval`);
    popt(`${v}.reapCountdown`);
    const endPos = JSON.parse(popt(`${v}.t.endPosition`));
    vatInfo.push([v, vn, endPos]);
    for (const key of groupKeys(`${v}.c.kd`)) {
      const val = popt(key);
      popt(`${v}.c.${val.slice(2)}`);
    }
    for (const key of groupKeys(`${v}.c.ko`)) {
      const val = popt(key);
      popt(`${v}.c.${val.slice(2)}`);
    }
    for (const key of groupKeys(`${v}.c.kp`)) {
      const val = popt(key);
      popt(`${v}.c.${val.slice(2)}`);
    }
    for (const key of groupKeys(`${v}.vs`)) {
      popt(key);
    }
  }
  for (const info of vatInfo) {
    const [v, vn, endPos] = info;
    gap();
    p(`// transcript of vat ${v} (${vn})`);
    if (endPos) {
      let idx = 1;
      for (const item of transcriptStore.readTranscript(v, 0, endPos)) {
        pkvBig('transcript', `${v}.${idx}`, item, 500);
        idx += 1;
      }
    } else {
      p(`// (no transcript)`);
    }
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

  if (outfile) {
    out.end('');
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
    const toSort = [];
    for (const key of groupKeys(baseKey)) {
      toSort.push([key, eat(key)]);
    }
    // sort similar keys by their numeric portions if possible, e.g.,
    // "ko7.owner" should be less than "ko43.owner" even though it would be the
    // other way around if they were simply compared as strings.
    toSort.sort((elem1, elem2) => {
      // chop off baseKey, since it's not useful for comparisons
      const key1 = elem1[0].slice(baseKey.length);
      const key2 = elem2[0].slice(baseKey.length);

      // find the first non leading digit position in each key
      const cut1 = key1.search(/[^0-9]/);
      const cut2 = key2.search(/[^0-9]/);

      // if either key lacks leading digits, at least one of them has no number
      // to compare, so just compare the keys themselves
      if (cut1 === 0 || cut2 === 0) {
        return key1.localeCompare(key2);
      }

      // treat the number parts as numbers
      const num1 = Number(key1.substr(0, cut1));
      const num2 = Number(key2.substr(0, cut2));

      if (num1 !== num2) {
        // if the numbers are different, the comparison is the comparison of the
        // numbers
        return num1 - num2;
      } else {
        // if the numbers are the same, the comparison is the comparison of the
        // remainder of the key, which, because of how we got here, is the same
        // as comparing the whole key
        return key1.localeCompare(key2);
      }
    });
    for (const [key, value] of toSort) {
      pkv(key, value);
    }
  }

  function eat(key) {
    if (state.has(key)) {
      const value = state.get(key);
      state.delete(key);
      return value;
    } else {
      return undefined;
    }
  }

  function popt(key) {
    const value = eat(key);
    if (value) {
      pkv(key, value);
    }
    return value;
  }

  function pkvBig(tag, key, value, maxWidth = 50) {
    if (value.length > maxWidth && truncate) {
      pkv(key, `<<${tag} ${value.length}>>`);
    } else {
      pkv(key, value);
    }
  }

  function poptBig(tag, key) {
    const value = eat(key);
    if (value) {
      pkvBig(tag, key, value);
    }
  }
}
