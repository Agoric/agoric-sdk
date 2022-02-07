function sub() {
  return 4;
}

function delveForeverIntoTheRecursiveDepths() {
  // Two calls defeat tail call optimization in engines such as XS.
  return (
    delveForeverIntoTheRecursiveDepths() + delveForeverIntoTheRecursiveDepths()
  );
}

export function meterMe(log2, explode = 'no') {
  log2.push('started');
  harden({});
  // console.log(`explode mode ${explode}`);
  for (let i = 0; i < 10; i += 1) {
    sub();
  }
  try {
    if (explode === 'compute') {
      // eslint-disable-next-line no-constant-condition, no-empty
      while (true) {}
    } else if (explode === 'stack') {
      delveForeverIntoTheRecursiveDepths();
    } else if (explode === 'allocate') {
      // eslint-disable-next-line no-unused-vars
      const universe = Array(4e9); // more like 1e24, really
      let big = '1234';
      for (;;) {
        big += big;
      }
    }
    log2.push('done');
    // console.log(`survived the attempted explosion`);
  } catch (e) {
    // We can catch normal Errors (including a stack overflow that Node.js
    // catches), but not meter exhaustion: the injected code will re-raise
    // meter exceptions before our original code can do anything. If we get
    // here, the injected metering code failed somehow. Emit a message so the
    // unit test can fail.
    log2.push('caught');
  }
  return 5;
}
