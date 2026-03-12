/* eslint-env node */

/**
 * Process-wide initialization for the planner service.
 *
 * Keep this module before `main` in the entrypoint.  The order below is
 * deliberately fussy:
 *
 * 1. `patch-console.js` captures the initial Node console as `originalConsole`
 *    and temporarily installs its `innerConsole`.
 * 2. `@endo/init/pre-remoting.js` installs the SES shims but does not call
 *    lockdown.
 * 3. local shims that must run before lockdown get their chance.
 * 4. lockdown creates the SES causal console around the current console, which
 *    is the `patch-console` inner console from step 1.
 * 5. the anylogger JSONL adapter is installed; it writes through the captured
 *    initial console so it does not recurse into the patched global console.
 * 6. `console-to-anylogger.js` installs the final outer console wrapper around
 *    the post-lockdown SES console.
 */

// We need some pre-lockdown shimming.
import '@agoric/internal/src/node/patch-console.js';
import '@endo/init/pre-remoting.js';
import './init/shims.js';

// import '@endo/lockdown/commit-debug.js';

// Now we can lockdown and install JSONL console routing.
import './init/lockdown.js';
import '@agoric/internal/src/anylogger-jsonl.js';
import './init/console-to-anylogger.js';
