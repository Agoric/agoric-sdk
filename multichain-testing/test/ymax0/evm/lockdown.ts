import 'ses';
import '@endo/eventual-send/shim.js';

const options = {
  overrideTaming: 'severe' as const,
  stackFiltering: 'verbose' as const,
  errorTaming: 'unsafe' as const,
};

lockdown(options);
