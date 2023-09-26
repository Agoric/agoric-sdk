// This is like `@endo/init` but sacrificing safety to optimize
// for debugging and testing. The difference is only the lockdown options.
// The setting below are *unsafe* and should not be used in contact with
// genuinely malicious code.

import '@endo/init/debug.js';
