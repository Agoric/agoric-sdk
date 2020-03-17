import tap from 'tap';
import { HandledPromise } from '../src/index.js';

export async function testHandledPromise() {
  tap.equal(typeof HandledPromise, 'function', 'HandledPromise is a function');
  let resolver2;
  const hp1 = new Promise(resolve => (resolver2 = resolve));
  resolver2('correct value');
  // this fails, "Cannot add property prepareStackTrace, object is not
  // extensible", maybe 'tap' is trying to modify a SES-frozen HandledPromise
  // tap.resolveMatch(hp1, /correct value/, 'HandledPromise resolves normally');
  const result = await hp1;
  tap.equal(result, 'correct value', 'HandledPromise resolves normally');
}
