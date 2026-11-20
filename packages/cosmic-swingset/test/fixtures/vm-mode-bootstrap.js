import { Far } from '@endo/far';

// Exercise the real kernel and bridge without booting application proposals.
export const buildRootObject = ({ D }) =>
  Far('bootstrap', {
    bootstrap(_vats, devices) {
      D(devices.bridge).registerInboundHandler(
        Far('inbound', {
          inbound() {},
        }),
      );
      D(devices.bridge).callOutbound('storage', {
        method: 'set',
        args: [['published.vmMode', 'bridge-ready']],
      });
    },
  });
