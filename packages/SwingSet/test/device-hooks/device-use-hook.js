import { buildSerializationTools } from '../../src/devices/lib/deviceTools.js';

export function buildDevice(tools, _endowments) {
  const { syscall } = tools;
  const dtools = buildSerializationTools(syscall, 'device-use-hook');
  const { deviceNodeForSlot, returnFromInvoke } = dtools;

  const ROOT = 'd+0';
  const DEVNODE_DREF = 'd+1';
  const devnode = deviceNodeForSlot(DEVNODE_DREF);

  // invoke() should use unserialize() and returnFromInvoke
  // throwing errors or returning undefined will crash the kernel

  const dispatch = {
    invoke: (dnid, method, argsCapdata) => {
      if (dnid === ROOT) {
        if (method === 'returnCapdata') {
          // exercise basic invocation, args, return value
          const hookResultCapdata = syscall.callKernelHook(
            'hook1',
            argsCapdata,
          );
          return returnFromInvoke({ hookResultCapdata });
        }
        if (method === 'returnActual') {
          const hookResultCapdata = syscall.callKernelHook(
            'hook1',
            argsCapdata,
          );
          return harden(['ok', hookResultCapdata]);
        }
        if (method === 'returnDevnode') {
          return returnFromInvoke(devnode);
        }
        if (method === 'throwError') {
          syscall.callKernelHook('throwError', argsCapdata); // throws
        }
        if (method === 'missingHook') {
          syscall.callKernelHook('missingHook', argsCapdata); // throws
        }
      }

      throw TypeError(`target does not exist`);
    },
  };
  return dispatch;
}
