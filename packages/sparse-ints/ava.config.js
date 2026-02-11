// This file is used to configure AVA for this package to avoid a warning when configuration is not next to package.json
// https://github.com/avajs/ava/blob/792b0e80df8fb7b85330493d15fbb0fd7620fae2/lib/cli.js#L108
import base from '../../ava.config.js';

// Base has a `test/` glob that works for this package so can simply re-export it.
export default base;
