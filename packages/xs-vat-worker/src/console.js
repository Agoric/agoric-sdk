/** console for xs platform */

const text = it => (typeof it === 'string' ? it : JSON.stringify(it));
const combine = (...things) => `${things.map(text).join(' ')}\n`;

/**
 * WARNING: caller is responsible to harden the returned object.
 *
 * makeConsole is designed to be called from an environment where
 * harden() is not yet available, since the SES code that currently
 * defines refers makes use of the conventional JavaScript console.
 */
export function makeConsole(write) {
  return {
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
  };
}
