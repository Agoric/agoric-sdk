import { Far } from '@endo/far';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog } = vatPowers;
  const handler = makeExo(
    'handler',
    M.interface('handler', {}, { defaultGuards: 'passable' }),
    {
      inbound(...args) {
        testLog('inbound');
        testLog(JSON.stringify(args));
      },
    },
  );

  return makeExo(
    'root',
    M.interface('root', {}, { defaultGuards: 'passable' }),
    {
      async bootstrap(vats, devices) {
        const { argv } = vatParameters;
        harden(argv);
        D(devices.bridge).registerInboundHandler(handler);
        const retval = D(devices.bridge).callOutbound(argv[0], argv[1]);
        testLog('outbound retval');
        testLog(JSON.stringify(retval));
        testLog(retval === undefined);
      },
    },
  );
}
