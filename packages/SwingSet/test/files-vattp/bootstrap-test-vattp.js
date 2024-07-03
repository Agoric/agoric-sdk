import { Far, E } from '@endo/far';
import { Fail } from '@endo/errors';

export function buildRootObject(vatPowers, vatParameters) {
  const { D, testLog: log } = vatPowers;
  const receiver = Far('receiver', {
    receive(body) {
      log(`ch.receive ${body}`);
    },
  });
  let transmitter;

  return Far('root', {
    async bootstrap(vats, devices) {
      // to exercise vat-vattp upgrade, we need the vatAdminService to
      // be configured, even though we don't use it ourselves
      await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      const { argv } = vatParameters;
      D(devices.mailbox).registerInboundHandler(vats.vattp);
      await E(vats.vattp).registerMailboxDevice(devices.mailbox);
      const name = 'remote1';
      const res = await E(vats.vattp).addRemote(name);
      transmitter = res.transmitter;
      // replace the E(vats.comms).addRemote() we'd normally do
      await E(res.setReceiver).setReceiver(receiver);

      if (argv[0] === '1') {
        log('not sending anything');
      } else if (argv[0] === '2') {
        E(transmitter).transmit('out1');
      } else {
        Fail`unknown argv mode '${argv[0]}'`;
      }
    },
    transmit(msg) {
      E(transmitter).transmit(msg);
    },
  });
}
