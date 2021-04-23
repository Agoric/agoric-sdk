import { WeakRef, FinalizationRegistry } from '../src/weakref';
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
  const gcTools = harden({ WeakRef, FinalizationRegistry });
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
