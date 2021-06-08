import engineGC from '../src/engine-gc';

import { WeakRef, FinalizationRegistry } from '../src/weakref';
import { waitUntilQuiescent } from '../src/waitUntilQuiescent';
import { makeGcAndFinalize } from '../src/gc-and-finalize';
import { makeLiveSlots } from '../src/kernel/liveSlots';

export function buildSyscall() {
  const log = [];

  const syscall = {
    send(targetSlot, method, args, resultSlot) {
      log.push({ type: 'send', targetSlot, method, args, resultSlot });
    },
    subscribe(target) {
      log.push({ type: 'subscribe', target });
    },
    resolve(resolutions) {
      log.push({ type: 'resolve', resolutions });
    },
    dropImports(slots) {
      log.push({ type: 'dropImports', slots });
    },
    retireImports(slots) {
      log.push({ type: 'retireImports', slots });
    },
    retireExports(slots) {
      log.push({ type: 'retireExports', slots });
    },
    exit(isFailure, info) {
      log.push({ type: 'exit', isFailure, info });
    },
  };

  return { log, syscall };
}

export function makeDispatch(
  syscall,
  build,
  vatID = 'vatA',
  enableDisavow = false,
) {
  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
  });
  const { setBuildRootObject, dispatch } = makeLiveSlots(
    syscall,
    vatID,
    {},
    {},
    undefined,
    enableDisavow,
    gcTools,
  );
  setBuildRootObject(build);
  return dispatch;
}
