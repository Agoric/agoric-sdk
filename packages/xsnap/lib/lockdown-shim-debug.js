// @ts-nocheck
import 'ses';

// see install-ses-debug.js
const debugOptions = {
  errorTaming: 'unsafe',
  // stackFiltering: 'verbose',
  overrideTaming: 'min',
};
lockdown(debugOptions);
