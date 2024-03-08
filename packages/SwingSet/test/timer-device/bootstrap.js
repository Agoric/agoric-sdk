import { Fail } from '@agoric/assert';
import { Nat } from '@endo/nat';
import { Far } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters) {
  const { D } = vatPowers;
  const log = vatPowers.testLog;
  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats, devices) {
        const { argv } = vatParameters;
        if (argv[0] === 'timer') {
          log(`starting wake test`);
          const handler = makeExo(
            'handler',
            M.interface('handler', {}, { defaultGuards: 'passable' }),
            {
              wake() {
                log(`handler.wake()`);
              },
            },
          );
          D(devices.timer).setWakeup(3n, handler);
        } else if (argv[0] === 'repeater') {
          log(`starting repeater test`);
          let handlerCalled = 0;
          const handler = makeExo(
            'handler',
            M.interface('handler', {}, { defaultGuards: 'passable' }),
            {
              wake(h) {
                handlerCalled += 1;
                log(
                  `handler.wake(${
                    h || 'handler'
                  }) called ${handlerCalled} times.`,
                );
              },
            },
          );
          const rptr = D(devices.timer).makeRepeater(
            Nat(argv[1]),
            Nat(argv[2]),
          );
          const nextTime = D(devices.timer).schedule(rptr, handler);
          log(`next scheduled time: ${nextTime}`);
        } else {
          Fail`unknown argv mode '${argv[0]}'`;
        }
      },
    },
  );
}
