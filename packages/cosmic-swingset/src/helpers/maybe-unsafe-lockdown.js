import 'ses';
import '@endo/eventual-send/shim.js';

try {
  lockdown({ __hardenTaming__: 'unsafe' });
} catch (_err) {
  // ignore
}
