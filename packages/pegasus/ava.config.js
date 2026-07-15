// This file configures AVA for this package. A config file next to each
// package.json avoids AVA's warning about using a config file from an
// ancestor directory:
// https://github.com/avajs/ava/blob/main/lib/cli.js
import base from '../../ava.config.js';

export default {
  ...base,
  timeout: '10m',
};
