/** console for xs platform */
const harden = x => Object.freeze(x, true);

const text = it => (typeof it === 'string' ? it : JSON.stringify(it));
const combine = (...things) => `${things.map(text).join(' ')}\n`;

export function makeConsole(write_) {
  const write = write_;
  return harden({
    log(...things) {
      write(combine(...things));
    },
    // node.js docs say this is just an alias for error
    warn(...things) {
      write(combine('WARNING: ', ...things));
    },
    // node docs say this goes to stderr
    error(...things) {
      write(combine('ERROR: ', ...things));
    },
  });
}
