function sub() {
  
  return 4;
}

function delve_forever_into_the_recursive_depths() {
  return delve_forever_into_the_recursive_depths();
}

export default function meterMe(log2, explode = 'no') {
  // console.log(`explode mode ${explode}`);
  for (let i = 0; i < 10; i++) {
    sub();
  }
  try {
    if (explode === 'compute') {
      while(true) {};
    } else if (explode === 'stack') {
      delve_forever_into_the_recursive_depths();
    } else if (explode === 'allocate') {
      let universe = Array(4e9); // more like 1e24, really
    }
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
