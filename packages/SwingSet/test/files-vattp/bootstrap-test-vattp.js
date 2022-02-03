import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X } from '@agoric/assert';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  const receiver = Far('receiver', {
    receive(body) {
      log(`ch.receive ${body}`);
    },
  });

  return Far('root', {
    async bootstrap(vats, devices) {
      const { argv } = vatParameters;
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);
      const name = 'remote1';
      const { transmitter, setReceiver } = await E(vats.vattp).addRemote(name);
      // replace the E(vats.comms).addRemote() we'd normally do
      await E(setReceiver).setReceiver(receiver);

      if (argv[0] === '1') {
        log('not sending anything');
      } else if (argv[0] === '2') {
        E(transmitter).transmit('out1');
      } else {
        assert.fail(X`unknown argv mode '${argv[0]}'`);
      }
    },
  });
}
