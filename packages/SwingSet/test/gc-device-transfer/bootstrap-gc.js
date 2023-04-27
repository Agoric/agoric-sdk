import { Far, E } from '@endo/far';

async function sendAmy(D, dev, testLog, left) {
  const amy = Far('amy', {
    hello: testLog,
  });
  D(dev).set(amy);
  await E(left).forget(amy);
}

export function buildRootObject(vatPowers) {
  const { D, testLog } = vatPowers;
  const pin = [];
  return Far('root', {
    async bootstrap(vats, devices) {
      pin.push(vats); // don't drop vat-right, our test needs it later
      // export amy to the device, and send to vat-left, then forget her
      void sendAmy(D, devices.stash_device, testLog, vats.left);
      // tell the vat to retrieve amy from the device
      await E(vats.right).acceptDevice(devices.stash_device);
    },
  });
}
