import 'ses';
import '@endo/eventual-send/shim.js';

const options = {
  overrideTaming: 'severe',
  stackFiltering: 'verbose',
  errorTaming: 'unsafe',
} as const;

lockdown(options);
