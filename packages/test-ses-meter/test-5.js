import './install-global-metering.js';
import 'ses';
lockdown();
const c = new Compartment({ foo: 0 });
// error: this evaluation fails, 'foo' is not defined
const namespace = c.evaluate('foo');
